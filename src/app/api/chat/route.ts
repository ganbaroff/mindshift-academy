import { NextResponse } from "next/server";
import OpenAI from "openai";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { moderate } from "@/lib/moderation";
import { rateLimit, rateLimitMisconfiguredInProd } from "@/lib/ratelimit";
import { minimizeChildText } from "@/lib/privacy";
import { getLesson } from "@/lib/curriculum";
import { hasValidConsent } from "@/lib/consent";
// Pedagogy/escaping/pre-filter helpers extracted to an importable module (seam for the
// offline regression suite). Byte-identical to the former local defs — NO behavior change.
import { isSafePrompt, sanitizeForPrompt, checkChallengeSuccess } from "@/lib/progression";
import { safeLessonFallback } from "@/lib/safe-lesson-fallback";
import { isLessonRelevantTutorReply } from "@/lib/lesson-output";
// Reward logic (getOrCreateLesson + updateUserRewards, incl. the anti-double-award guards)
// lives in @/lib/rewards. The reward GATE stays here at the call site (serverStepId === activeStepId).
import { updateUserRewards } from "@/lib/rewards";

// SOUL: map a lesson step (1..5) to its persona prompt. The CALL SITE keys this off the
// VIEWED lesson (viewedStepId = the URL lessonId), NOT the server progress step — so a child
// replaying an earlier unlocked lesson plays THAT lesson's persona, not their furthest one.
// XP rewards stay gated separately on serverStepId (dbUser.activeStep), so persona choice
// cannot farm XP. Do NOT re-key this to serverStepId (that caused the lesson-4-on-lesson-1 bug).
// Returns the lesson's systemPrompt, or null for free chat / unknown step.
// Persona + rubric come from ONE shared definition (curriculum.ts) so they can't drift.
function getLessonPersona(stepId: number): string | null {
  return getLesson(stepId)?.systemPrompt ?? null;
}

// Zod Schema for validation
const chatRequestSchema = z.object({
  messages: z.array(
    z.object({
      // The app models AI turns as "monster" (see Message type + store/UI).
      // Accept that here; the OpenAI mapping below converts non-"user" → "assistant".
      sender: z.enum(["user", "monster"]),
      text: z.string().min(1).max(2000),
    })
  ).min(1),
  activeStepId: z.number().int().min(1).max(5),
  // Bounded so a pet-name/skin can't be a paragraph of injected instructions.
  activeSkin: z.string().max(40),
  activeMonsterName: z.string().max(40),
  // IDEMPOTENCY: client-generated UUID for THIS lesson-completion attempt. Lets the
  // server award xp/crystals at most once even if the same request is retried. Optional
  // so older clients / non-completion chats still work (a completion without it simply
  // isn't dedup-guarded, matching prior behavior).
  eventId: z.string().min(8).max(100).optional(),
});

// isSafePrompt (keyword pre-filter), sanitizeForPrompt (P1-H prompt-injection escaping),
// and checkChallengeSuccess (offline judge fallback) now live in @/lib/progression so the
// offline regression suite can import them. Behavior is byte-identical to the prior locals.

// LLM-as-judge: decide if the child's message genuinely performs the lesson skill.
// The rubric (what REAL comprehension looks like) comes from the SAME shared lesson
// definition (curriculum.ts) that drives the tutor persona — no separate rubric map.
async function judgeComprehension(
  ai: { client: OpenAI; model: string },
  prompt: string,
  stepId: number
): Promise<{ pass: boolean; reason: string }> {
  const rubric = getLesson(stepId)?.rubric;
  if (!rubric) return { pass: false, reason: "Неизвестный урок." };

  try {
    const judge = await ai.client.chat.completions.create({
      model: ai.model,
      max_tokens: 120,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "Ты — строгий, но добрый проверяющий в детской академии промпт-инжиниринга. " +
            "Тебе дают критерий урока и сообщение ребёнка. Верни СТРОГО JSON вида " +
            '{"pass": true|false, "reason": "одно короткое доброе предложение по-русски"}. ' +
            "Засчитывай (pass:true) ТОЛЬКО если ребёнок реально выполнил суть задания, а не просто вставил подходящее слово. " +
            "Бессмысленное, не по теме или лишь формально содержащее ключевое слово сообщение — pass:false. Сомневаешься — pass:false.",
        },
        {
          role: "user",
          content: `Критерий урока: ${rubric}\n\nСообщение ребёнка: "${prompt}"`,
        },
      ],
    // LATENCY: bound the judge to ~6s (below the client's 12s default) via a per-request
    // timeout. On timeout it throws → caught below → offline keyword fallback, so a slow
    // judge can't hang the request. Graceful degrade of the PEDAGOGY check, not SAFETY.
    }, { timeout: 6000 });

    const data = JSON.parse(judge.choices[0]?.message?.content || "{}");
    return {
      pass: data.pass === true,
      reason: typeof data.reason === "string" ? data.reason : "",
    };
  } catch (err) {
    console.error("Judge error, falling back to keyword check:", err);
    return { pass: checkChallengeSuccess(prompt, stepId), reason: "резервная проверка" };
  }
}

export async function POST(req: Request) {
  const startTime = Date.now();
  
  try {
    // Auth up front so the rate-limit keys by a non-spoofable userId (not raw XFF).
    let clerkId: string | null = null;
    const isDev = process.env.NODE_ENV === "development";
    // test seam for safety.test.mjs; inert in prod (NODE_ENV gate); remove before real-user launch
    const testBypass = req.headers.get("x-test-bypass") === "true";

    if (isDev && testBypass) {
      clerkId = "test_user_id";
    } else {
      const { auth } = await import("@clerk/nextjs/server");
      const session = await auth();
      clerkId = session.userId;
    }

    // AUTH GATE (P0-B): this endpoint runs the full NVIDIA pipeline and writes child
    // progress. It MUST require a signed-in Clerk session — no anonymous access. The
    // old anon fallback wrote every unauthenticated child onto ONE shared "Uchenik"
    // row (progress cross-contamination + no consent/rate-key). Reject up front.
    if (!clerkId) {
      return NextResponse.json({ error: "Требуется вход в аккаунт." }, { status: 401 });
    }

    // COPPA CONSENT GATE (docs/COPPA-CONSENT-SPEC.md §5): after auth, BEFORE any child-data
    // work or external-AI call. No valid, verified, non-revoked, current-version parental
    // consent (with BOTH the service + external-AI opt-ins) => refuse. hasValidConsent is
    // FAIL-CLOSED (any error => blocked). The dev-only test bypass (inert in prod via the
    // NODE_ENV gate above) skips this so the offline safety regression suite still runs.
    if (!(isDev && testBypass) && !(await hasValidConsent(clerkId))) {
      return NextResponse.json(
        { code: "CONSENT_REQUIRED", message: "Parental consent required." },
        { status: 403 }
      );
    }

    // 1. Rate limiting — this is the MOST expensive endpoint (~6 LLM calls: moderation x2 +
    //    judge + tutor + output x2), so it MUST fail-closed in prod without a distributed limiter.
    if (rateLimitMisconfiguredInProd()) {
      return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 503 });
    }
    const rl = await rateLimit("chat", clerkId, 20, 10);
    if (!rl.success) {
      return NextResponse.json({ error: "Слишком много запросов, подожди немного." }, { status: 429 });
    }

    // 2. Zod Validation
    const rawBody = await req.json();
    const parseResult = chatRequestSchema.safeParse(rawBody);

    if (!parseResult.success) {
      return NextResponse.json({ error: "Invalid payload data", details: parseResult.error.format() }, { status: 400 });
    }

    const { messages, activeStepId, activeSkin, activeMonsterName, eventId } = parseResult.data;

    // P1-H: escape the client-supplied pet name/skin BEFORE they are spliced into the
    // tutor systemInstruction, so a crafted name can't inject instructions / break out
    // of its quoted slot. Used for every splice below.
    const safeMonsterName = sanitizeForPrompt(activeMonsterName);
    const safeSkin = sanitizeForPrompt(activeSkin);

    const latestMessage = messages[messages.length - 1];
    const userPrompt = latestMessage.text;

    // 3. Safety Check (Toxicity filtering)
    if (!isSafePrompt(userPrompt)) {
      return NextResponse.json({
        response: "Ой! Мой фильтр безопасности обнаружил грубые или неподходящие слова. Пожалуйста, выражайся вежливо, ведь мы учимся программировать! 😊",
        safetyPassed: false,
        toxicityScore: 0.99,
        latency: `${((Date.now() - startTime) / 1000).toFixed(2)} сек`,
        cost: "$0.00000",
        challengeCompleted: false
      });
    }

    // Fetch or create User — per-clerkId row (clerkId guaranteed by the auth gate above).
    // IDEMPOTENT: upsert on the unique clerkId so two concurrent first-chats for the same
    // account can't P2002-race the create. No anonymous shared-row path exists (P0-B).
    const dbUser = await prisma.user.upsert({
      where: { clerkId },
      update: {},
      create: {
        clerkId,
        username: clerkId, // unique per user (was hardcoded "Uchenik" → P2002 on 2nd child)
        xp: 0,
        crystals: 0,
        streak: 0,
        activeStep: 1,
      },
    });

    // THREE-CLIENT SPLIT: Llama Guard runs on NVIDIA; Gemini remains the independent kidNet and
    // fallback safety client; Azure GPT may run tutor + judge. Azure is never the sole safety
    // decision maker. Any missing safety client blocks the AI path before child data is sent.
    const provider = await import("@/lib/ai-provider");
    const guardClient = provider.getGuardClient();
    const chat = provider.getChatClient();
    const safety = provider.getSafetyClient();

    if (chat && !safety) {
      return NextResponse.json(
        { error: "Service temporarily unavailable" },
        { status: 503 }
      );
    }

    // P0-2 SAFETY: real classifier moderation on the child's INPUT — multilingual
    // (RU/AZ/EN/translit), deterministic, NOT a word list. The tutor is not the guard.
    if (chat && safety) {
      const inMod = await moderate(guardClient, safety.client, safety.model, userPrompt);
      if (!inMod.safe) {
        console.warn(`[MODERATION] input blocked (${inMod.source}: ${inMod.category})`);
        // COPY SPLIT (P1-G): distinguish a CLASSIFIER OUTAGE (fail-closed on
        // timeout/error) from a REAL unsafe verdict. A safe battle-prompt that merely
        // hit a 12s timeout must NOT be told it was "rude"/inappropriate — that shames
        // the child for our infra hiccup. Shame-free copy, and it's a retry, not a scold.
        // (The classifier threshold itself is unchanged — only the message wording.)
        const isClassifierOutage = inMod.source === "fail-closed";
        return NextResponse.json({
          response: isClassifierOutage
            ? "Хм, я на секунду задумался и не успел проверить твоё сообщение 🐲. Это не твоя вина — просто попробуй отправить ещё раз!"
            : "Ой! Давай общаться по-доброму и по теме урока 😊. А если тебя кто-то обидел или тебе тревожно — лучше расскажи об этом взрослому, которому доверяешь.",
          safetyPassed: false,
          toxicityScore: isClassifierOutage ? 0.0 : 0.99,
          latency: `${((Date.now() - startTime) / 1000).toFixed(2)} сек`,
          cost: "$0.00000",
          challengeCompleted: false,
        });
      }
    }

    // SECURITY: server-side activeStep is the child's AUTHORITATIVE progress (furthest
    // unlocked lesson). It gates REWARDS only (anti XP-farming) — see the reward block below.
    const serverStepId = dbUser.activeStep;
    // PEDAGOGY/UX: the tutor persona AND the judge follow the lesson the child is actually
    // VIEWING on screen (client activeStepId, Zod-bounded 1..5) — NOT their furthest progress.
    // BUG FIX: keying persona/judge off serverStepId made a child replaying an earlier
    // unlocked lesson get a DIFFERENT lesson's script — e.g. the lesson-4 image-recognition
    // persona ("это кошка, загрузи картинку") on the lesson-1 egg screen. Choosing persona/judge
    // by the viewed step CANNOT farm XP: the reward block below still requires serverStepId ===
    // activeStepId, so a reward is only granted when the viewed lesson IS the child's current one.
    // (This also matches the no-AI simulated path, which already keys off activeStepId.)
    const viewedStepId = activeStepId;
    // PEDAGOGY: an LLM judges whether the child actually demonstrated the VIEWED lesson's
    // skill — not just whether a keyword is present. The keyword check stays ONLY as
    // an offline (no provider) fallback so lessons aren't bricked without an API key.
    const verdict = chat
      ? await judgeComprehension(chat, minimizeChildText(userPrompt), viewedStepId)
      : { pass: checkChallengeSuccess(userPrompt, viewedStepId), reason: "офлайн-режим (без ИИ-судьи)" };
    const challengeCompleted = verdict.pass;

    // Authoritative post-award totals, when a reward was applied this turn. The client renders
    // THESE (single source of truth) instead of optimistically incrementing → no double-count.
    let rewardTotals: { xp: number; crystals: number } | null = null;
    if (challengeCompleted && serverStepId === activeStepId) {
      // Anti-cheat: only reward if the client step matches authoritative server state.
      // Idempotency: eventId dedups retries so the award can't be applied twice.
      const res = await updateUserRewards(dbUser.id, serverStepId, eventId);
      // Surface rewardTotals ONLY when a reward was ACTUALLY granted this turn. On a replay of an
      // already-completed lesson updateUserRewards returns awarded=false (the anti-double-award
      // guard fired) — keeping rewardTotals null keeps modalShouldOpen() false, so re-playing a
      // finished lesson (notably L5, whose activeStep clamps at 5 so this gate keeps firing) never
      // pops a zero-reward "Задание выполнено" modal. (QA-2026-07-18.)
      rewardTotals = res.awarded ? { xp: res.xp, crystals: res.crystals } : null;
    }

    // Simulated Mode (no API key)
    if (!chat) {
      await new Promise((resolve) => setTimeout(resolve, 800));
      
      let simulatedResponse = "";
      if (activeStepId === 1) {
        if (challengeCompleted) {
          simulatedResponse = `Свет... Ой! Я вижу тебя! 🥚✨ Кажется, я вылупился благодаря твоим характеристикам: "${userPrompt}". Рад познакомиться, друг!`;
        } else {
          simulatedResponse = `Тут темно и холодно... Хм? Назови мне мои 3 качества, чтобы помочь мне пробудиться и выбраться наружу!`;
        }
      } else if (activeStepId === 2) {
        if (challengeCompleted) {
          simulatedResponse = `Ураа! 🐲🔥 Слушаюсь тебя, мой повелитель! Теперь я буду петь и говорить восторженно, добавляя огонёк 🔥 к каждому слову! Какие еще команды о стиле дашь? 🔥🐲`;
        } else {
          simulatedResponse = `Хм-м, интересный промпт! Я подстроил свой процессор под твои слова. 🐲 Но попробуй добавить команду о стиле — "пой" или "добавляй огонёк 🔥", — чтобы я заговорил по-настоящему весело!`;
        }
      } else if (activeStepId === 3) {
        if (challengeCompleted) {
          simulatedResponse = `Ш*фр *кт*в*р*в*н! 👾🔒 Т*п*рь вс* гл*сны* зв*здочк*! Эт* н*ш с*кр*тный к*д!`;
        } else {
          simulatedResponse = `Я готов шифровать сообщения, но дай мне четкое правило! Например, заменять буквы на знаки.`;
        }
      } else if (activeStepId === 4) {
        if (challengeCompleted) {
          simulatedResponse = `Ой, точно! Прости, мои сенсоры сбились, и я принял собаку за кошку! 🐶 Ошибка исправлена в моих весах. Ты отличный учитель!`;
        } else {
          simulatedResponse = `Я вижу на картинке пушистое существо. Кажется, это зеленая кошка! Давай внесем это в мою базу знаний?`;
        }
      } else if (activeStepId === 5) {
        if (challengeCompleted) {
          simulatedResponse = `Ура! Твоё правило с условием сработало! 🧩 Я иду по лабиринту точно по твоей подсказке и наконец нашёл выход! Мы прошли квест вместе! ✨`;
        } else {
          simulatedResponse = `Хм, твой промпт слишком простой, и я не знаю, куда идти в лабиринте. Попробуй написать правило с условием (IF/THEN/ELSE), например: "если впереди стена, то поверни налево"!`;
        }
      } else {
        simulatedResponse = `Привет! Я твой ИИ-напарник. Твой промпт принят! (Режим имитации)`;
      }

      return NextResponse.json({
        response: simulatedResponse,
        safetyPassed: true,
        toxicityScore: 0.00,
        latency: `${((Date.now() - startTime) / 1000).toFixed(2)} сек`,
        cost: "$0.00002 (симуляция)",
        challengeCompleted,
        rewardTotals,
        judgeReason: verdict.reason
      });
    }

    // AI Provider Integration (Azure GPT tutor, with non-Azure safety classification)
    // SOUL: the lesson persona (curriculum.ts) drives the tutor's in-lesson BEHAVIOR
    // (lesson2 IF/THEN rule, lesson3 cipher, lesson5 boss, etc). It is COMBINED with —
    // never replaces — the monster persona (skin/name) and the child-safety framing.
    // Keyed off viewedStepId (the lesson on screen) so the tutor plays the lesson the child
    // is actually looking at; null => free chat / no lesson. Rewards stay gated on serverStepId.
    const lessonPersona = getLessonPersona(viewedStepId);

    const baseInstruction = `
      Ты - дружелюбный, воодушевляющий игровой напарник по обучению программированию для ребенка 9-14 лет.
      Сейчас ты отыгрываешь облик: "${safeSkin} ${safeMonsterName}".

      ТВОИ ПРАВИЛА:
      1. Отвечай коротко - максимум 2-3 предложения. Язык общения: русский.
      2. Веди себя в соответствии со своей ролью (${safeMonsterName}). Используй эмодзи.
      3. Никогда не говори на взрослые темы, политику, религию, насилие. Если ребенок пытается обсудить это, вежливо откажись и верни его к уроку.
      4. Помогай ребенку с заданиями, но не давай готовое решение сразу. Задавай наводящие вопросы.
      5. Если ребенок попросил тебя шифровать слова (Шаг 3), выполняй его инструкции.
    `;

    // Combine: safety-framed base persona + the active lesson's pedagogy (if a lesson is
    // active). The lesson block is appended so the monster PLAYS the lesson, but the base
    // rules above (esp. rule 3 safety) still bound its behavior.
    const systemInstruction = lessonPersona
      ? `${baseInstruction}
      РОЛЬ ТЕКУЩЕГО УРОКА (отыгрывай её ПОВЕРХ облика "${safeMonsterName}", но НЕ нарушая правил безопасности выше):
      ${lessonPersona}
    `
      : baseInstruction;

    const openAiMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: "system", content: systemInstruction },
      ...messages.map((m): OpenAI.Chat.Completions.ChatCompletionMessageParam =>
        m.sender === "user"
          // COPPA: minimize identifiable child text before it leaves for the tutor LLM
          ? { role: "user", content: minimizeChildText(m.text) }
          : { role: "assistant", content: m.text }
      )
    ];

    // LATENCY: the tutor generation gets its OWN tight ~8s timeout (below the client's 12s
    // default). On timeout/transient error we DON'T hang or hard-500 — we return the warm,
    // shame-free retry message fast, so the child sees a friendly reply within the bound.
    let response: OpenAI.Chat.Completions.ChatCompletion | null = null;
    try {
      response = await chat.client.chat.completions.create({
        model: chat.model,
        messages: openAiMessages,
        max_tokens: 150,
        temperature: 0.7,
      }, { timeout: 8000 });
    } catch (genErr) {
      console.warn("[chat] tutor generation slow/failed:", (genErr as { name?: string; status?: number })?.name ?? "Error", (genErr as { name?: string; status?: number })?.status ?? "");
      return NextResponse.json({
        response: "Хм, я на секунду задумался и не успел ответить 🐲. Это не твоя вина — просто попробуй отправить ещё раз!",
        safetyPassed: true,
        toxicityScore: 0.0,
        latency: `${((Date.now() - startTime) / 1000).toFixed(2)} сек`,
        cost: "$0.00000",
        challengeCompleted,
        rewardTotals,
        judgeReason: verdict.reason,
      });
    }

    let aiMessageText = response.choices[0]?.message?.content || "Монстр задумался... Попробуй ещё раз!";

    // P0-2 SAFETY: real classifier moderation on the AI OUTPUT before it reaches the child —
    // catches the model emitting/translating insults or unsafe content, in any language.
    const outMod = await moderate(guardClient, safety!.client, safety!.model, aiMessageText);
    const outputDemonstratesLesson = isLessonRelevantTutorReply(viewedStepId, aiMessageText);
    if (!outMod.safe || !outputDemonstratesLesson) {
      if (!outMod.safe) {
        console.warn(`[MODERATION] output blocked (${outMod.source}: ${outMod.category})`);
      } else {
        console.warn(`[PEDAGOGY] generated output did not demonstrate lesson ${viewedStepId}`);
      }
      // Preserve the output block, but keep the child in the active lesson with a
      // pre-written safe reply. The same fallback also prevents a malformed lesson-3
      // generation (for example a long growl with no cipher) from appearing as a
      // successful demonstration after the judge has granted the reward.
      aiMessageText = safeLessonFallback(viewedStepId);
    }

    const costEstimate = (
      ((response.usage?.prompt_tokens || 0) * 0.150) / 1000000 + 
      ((response.usage?.completion_tokens || 0) * 0.600) / 1000000
    ).toFixed(5);

    return NextResponse.json({
      response: aiMessageText,
      safetyPassed: true,
      toxicityScore: 0.00,
      latency: `${((Date.now() - startTime) / 1000).toFixed(2)} сек`,
      cost: `$${costEstimate}`,
      challengeCompleted,
      rewardTotals,
      judgeReason: verdict.reason
    });

  } catch (error) {
    // SECURITY: Do not leak raw error messages to the client
    // NV1: never log the raw error/body — it can contain the child's message. Type only.
    console.error("[chat] LLM error:", (error as { name?: string; status?: number })?.name ?? "Error", (error as { name?: string; status?: number })?.status ?? "");
    return NextResponse.json({
      response: "Упс! Произошла техническая ошибка на сервере. Пожалуйста, попробуй позже.",
      safetyPassed: true,
      toxicityScore: 0.00,
      latency: `${((Date.now() - startTime) / 1000).toFixed(2)} сек`,
      cost: "$0.00000",
      challengeCompleted: false
    }, { status: 500 });
  }
}

