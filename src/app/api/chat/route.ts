import { NextResponse } from "next/server";
import OpenAI from "openai";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { moderate } from "@/lib/moderation";
import { rateLimit, rateLimitMisconfiguredInProd, publicClientKey } from "@/lib/ratelimit";
import { minimizeChildText } from "@/lib/privacy";
import { LESSON_PROMPTS } from "@/lib/curriculum";

// SOUL: map the authoritative server step (1..5) to its lesson persona prompt.
// The lesson route builds the SAME key (`lesson${lessonId}`, lessonId = 1..5) from
// the URL param, and the client mirrors that step into activeStepId. We key off the
// server-side step (dbUser.activeStep) so the persona can't be spoofed from the client.
// Returns the lesson's systemPrompt, or null for free chat / unknown step.
function getLessonPersona(stepId: number): string | null {
  const key = `lesson${stepId}` as keyof typeof LESSON_PROMPTS;
  const lesson = LESSON_PROMPTS[key];
  return lesson ? lesson.systemPrompt : null;
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
  activeSkin: z.string(),
  activeMonsterName: z.string(),
});

// Simple local safety check to block bad words
const BLOCKLIST = [
  "дурак", "дебил", "идиот", "лох", "сука", "бля", "хер", "хуй", "говно", 
  "урод", "смерть", "убить", "секс", "порно", "наркотики", "сигареты", "алкоголь"
];

// Tiny keyword PRE-FILTER only (cheap fast-path). Word-boundaried so "хер" no longer
// matches "Херсон". The real multilingual gate is moderate() in @/lib/moderation.
function isSafePrompt(prompt: string): boolean {
  const lowercase = prompt.toLowerCase();
  return !BLOCKLIST.some((word) => new RegExp(`(^|[^а-яё])${word}([^а-яё]|$)`, "i").test(lowercase));
}

// Check if step challenge is met
function checkChallengeSuccess(prompt: string, stepId: number): boolean {
  const lowercase = prompt.toLowerCase();
  const words = lowercase.split(/\s+/).filter(w => w.trim().length > 1);

  if (stepId === 1) {
    // Lesson 1: Birth / Awakening. User must define 3 adjectives or describe the monster (at least 3 words)
    return words.length >= 3;
  }
  if (stepId === 2) {
    // Lesson 2: Emotions. User should instruct the monster on the IF/THEN rule.
    return lowercase.includes("рычи") || 
           lowercase.includes("рычать") || 
           lowercase.includes("рычишь") || 
           lowercase.includes("динозавр") || 
           lowercase.includes("ррр") ||
           lowercase.includes("если") ||
           lowercase.includes("солнце");
  }
  if (stepId === 3) {
    // Lesson 3: Cipher. User sets cipher algorithm.
    return lowercase.includes("звезд") || 
           lowercase.includes("шифр") || 
           lowercase.includes("*") || 
           lowercase.includes("гласн") ||
           lowercase.includes("замени");
  }
  if (stepId === 4) {
    // Lesson 4: Vision. User corrects the monster's vision error.
    return lowercase.includes("нет") || 
           lowercase.includes("не") || 
           lowercase.includes("это") || 
           lowercase.includes("правильно") || 
           lowercase.includes("исправь") || 
           lowercase.includes("ошибка") ||
           lowercase.includes("собака") ||
           lowercase.includes("кошка");
  }
  if (stepId === 5) {
    // Lesson 5: Boss Battle. Prompt complexity reduces HP. Needs logical constraints and 5+ words.
    const hasLogic = lowercase.includes("если") || 
                      lowercase.includes("тогда") || 
                      lowercase.includes("иначе") || 
                      lowercase.includes("if") || 
                      lowercase.includes("then") || 
                      lowercase.includes("else") ||
                      lowercase.includes("формат") ||
                      lowercase.includes("правило");
    return words.length >= 5 && hasLogic;
  }
  return false;
}

// PEDAGOGY: what REAL comprehension looks like per lesson (not "contains a keyword").
const LESSON_RUBRICS: Record<number, string> = {
  1: "Урок «Пробуждение». Засчитывается, только если ребёнок описал монстра, дав минимум ТРИ разных осмысленных качества/характеристики (например: храбрый, быстрый, огненный). Случайный набор слов, цифры или бессмысленные слова, не являющиеся качествами, — НЕ засчитывать.",
  2: "Урок «Характер». Засчитывается, только если ребёнок дал монстру ИНСТРУКЦИЮ, как себя вести/говорить/реагировать (например: «рычи перед каждым словом», «говори как грозный дракон и дыши огнём»). Фраза не про поведение монстра — НЕ засчитывать.",
  3: "Урок «Секретный язык». Засчитывается, только если ребёнок задал ПРАВИЛО шифра — конкретное преобразование текста (например: «заменяй все гласные на звёздочки»). Если правила преобразования нет (одиночный символ, случайная фраза) — НЕ засчитывать.",
  4: "Урок «Машинное зрение». ИИ ошибочно решил, что на картинке кошка. Засчитывается, только если ребёнок именно ИСПРАВИЛ ошибку — указал, что это НЕ кошка, и/или дал команду исправить, назвав верный объект (собаку). Одно голое слово-объект (например просто «собака») без акта исправления — НЕ засчитывать.",
  5: "Урок «Битва промптов». Засчитывается, только если ребёнок написал промпт с ОСМЫСЛЕННЫМ логическим условием, реально управляющим поведением (структура «если … то … [иначе …]» с понятным смыслом, например: «если видишь врага, то атакуй, иначе защищайся»). Бессмысленная присказка со словами «если/тогда» без реальной логики — НЕ засчитывать.",
};

// LLM-as-judge: decide if the child's message genuinely performs the lesson skill.
async function judgeComprehension(
  ai: any,
  prompt: string,
  stepId: number
): Promise<{ pass: boolean; reason: string }> {
  const rubric = LESSON_RUBRICS[stepId];
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
    });

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

// Helper to find or seed a lesson dynamically
async function getOrCreateLesson(stepId: number) {
  let lesson = await prisma.lesson.findUnique({
    where: { order: stepId },
  });

  if (!lesson) {
    const details = [
      { title: "Пробуждение", desc: "Назови 3 качества монстра, чтобы согреть его и помочь вылупиться!" },
      { title: "Настройка характера", desc: "Задай промпт-инструкцию для дракончика, добавив команду 'РЫЧАТЬ'." },
      { title: "Секретный язык", desc: "Напиши секретное правило шифра, заменяющее все гласные буквы на звездочки." },
      { title: "Машинное зрение", desc: "Исправь зрение монстра через промпт-тюнинг (назови объект собакой)." },
      { title: "Битва промптов", desc: "Напиши промпт с ветвлением логики IF/THEN, чтобы одолеть Bugzilla." },
    ];
    const item = details[stepId - 1] || { title: `Урок ${stepId}`, desc: `Задание для шага ${stepId}` };

    lesson = await prisma.lesson.create({
      data: {
        order: stepId,
        title: item.title,
        description: item.desc,
        xpReward: stepId * 100,
        crystalRwd: stepId * 10,
      },
    });
  }

  return lesson;
}

// Helper to update user rewards and lesson progress in DB
async function updateUserRewards(userId: string, stepId: number) {
  try {
    let xpGain = 0;
    let crystalsGain = 0;
    let nextStep = stepId;

    if (stepId === 1) {
      xpGain = 100;
      crystalsGain = 10;
      nextStep = 2;
    } else if (stepId === 2) {
      xpGain = 150;
      crystalsGain = 15;
      nextStep = 3;
    } else if (stepId === 3) {
      xpGain = 200;
      crystalsGain = 20;
      nextStep = 4;
    } else if (stepId === 4) {
      xpGain = 250;
      crystalsGain = 30;
      nextStep = 5;
    } else if (stepId === 5) {
      xpGain = 500;
      crystalsGain = 100;
      nextStep = 5;
    }

    // 1. Update user profile statistics
    await prisma.user.update({
      where: { id: userId },
      data: {
        xp: { increment: xpGain },
        crystals: { increment: crystalsGain },
        activeStep: nextStep
      }
    });

    // 2. Ensure the lesson model is initialized in database
    const lesson = await getOrCreateLesson(stepId);

    // 3. Upsert the lesson progress completion state
    await prisma.lessonProgress.upsert({
      where: {
        userId_lessonId: {
          userId,
          lessonId: lesson.id,
        },
      },
      update: {
        completed: true,
        completedAt: new Date(),
        score: 100,
      },
      create: {
        userId,
        lessonId: lesson.id,
        completed: true,
        completedAt: new Date(),
        score: 100,
      },
    });
  } catch (err) {
    console.error("Database rewards update failed:", err);
  }
}

export async function POST(req: Request) {
  const startTime = Date.now();
  
  try {
    // Auth up front so the rate-limit keys by a non-spoofable userId (not raw XFF).
    const { auth } = await import("@clerk/nextjs/server");
    const { userId: clerkId } = await auth();

    // 1. Rate limiting — this is the MOST expensive endpoint (~6 LLM calls: moderation x2 +
    //    judge + tutor + output x2), so it MUST fail-closed in prod without a distributed limiter.
    if (rateLimitMisconfiguredInProd()) {
      return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 503 });
    }
    const rlKey = clerkId ?? publicClientKey(req);
    if (!rlKey) {
      return NextResponse.json({ error: "Не удалось проверить источник запроса." }, { status: 429 });
    }
    const rl = await rateLimit("chat", rlKey, 20, 10);
    if (!rl.success) {
      return NextResponse.json({ error: "Слишком много запросов, подожди немного." }, { status: 429 });
    }

    // 2. Zod Validation
    const rawBody = await req.json();
    const parseResult = chatRequestSchema.safeParse(rawBody);

    if (!parseResult.success) {
      return NextResponse.json({ error: "Invalid payload data", details: parseResult.error.format() }, { status: 400 });
    }

    const { messages, activeStepId, activeSkin, activeMonsterName } = parseResult.data;

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

    // Fetch or create User (per-clerkId row for signed-in users) — clerkId resolved above.
    let dbUser;
    if (clerkId) {
      dbUser = await prisma.user.findUnique({
        where: { clerkId },
      });
      if (!dbUser) {
        // First chat for this Clerk account — create their own row
        dbUser = await prisma.user.create({
          data: {
            clerkId,
            username: clerkId, // NV/#1: unique per user (was hardcoded "Uchenik" → P2002 on 2nd child)
            xp: 0,
            crystals: 0,
            streak: 0,
            activeStep: 1,
          },
        });
      }
    }

    if (!dbUser) {
      // Anonymous / no Clerk session — shared demo user
      dbUser = await prisma.user.findUnique({
        where: { username: "Uchenik" },
      });
      if (!dbUser) {
        dbUser = await prisma.user.create({
          data: {
            username: "Uchenik",
            xp: 0,
            crystals: 0,
            streak: 0,
            activeStep: 1,
          },
        });
      }
    }

    const ai = (await import("@/lib/ai-provider")).getAIClient();

    // P0-2 SAFETY: real classifier moderation on the child's INPUT — multilingual
    // (RU/AZ/EN/translit), deterministic, NOT a word list. The tutor is not the guard.
    if (ai) {
      const inMod = await moderate(ai.client, ai.model, userPrompt);
      if (!inMod.safe) {
        console.warn(`[MODERATION] input blocked (${inMod.source}: ${inMod.category})`);
        return NextResponse.json({
          response: "Ой! Давай общаться по-доброму и по теме урока 😊. А если тебя кто-то обидел или тебе тревожно — лучше расскажи об этом взрослому, которому доверяешь.",
          safetyPassed: false,
          toxicityScore: 0.99,
          latency: `${((Date.now() - startTime) / 1000).toFixed(2)} сек`,
          cost: "$0.00000",
          challengeCompleted: false,
        });
      }
    }

    // SECURITY: Use server-side activeStep, NOT client-supplied activeStepId
    // Prevents XP farming by sending arbitrary stepId from client
    const serverStepId = dbUser.activeStep;
    // PEDAGOGY: an LLM judges whether the child actually demonstrated the lesson's
    // skill — not just whether a keyword is present. The keyword check stays ONLY as
    // an offline (no provider) fallback so lessons aren't bricked without an API key.
    const verdict = ai
      ? await judgeComprehension(ai, minimizeChildText(userPrompt), serverStepId)
      : { pass: checkChallengeSuccess(userPrompt, serverStepId), reason: "офлайн-режим (без ИИ-судьи)" };
    const challengeCompleted = verdict.pass;

    if (challengeCompleted && serverStepId === activeStepId) {
      // Only reward if client step matches server state (prevents replay)
      await updateUserRewards(dbUser.id, serverStepId);
    }

    // Simulated Mode (no API key)
    if (!ai) {
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
          simulatedResponse = `Рррррар! 🐲🔥 Слушаюсь тебя, мой повелитель! Теперь я буду грозным элементальным драконом! Рррр! Какие еще команды дашь? 🔥🐲`;
        } else {
          simulatedResponse = `Хм-м, интересный промпт! Я подстроил свой процессор под твои слова. 🐲 Но попробуй добавить команду "РЫЧАТЬ", чтобы я стал по-настоящему свирепым!`;
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
          simulatedResponse = `АААРГХ! Твой промпт-код слишком силен! Моя защита Bugzilla пробита сложным условием! 💥 Мои HP упали до 0! Вы победили!`;
        } else {
          simulatedResponse = `Ха-ха! Твой промпт слишком простой! Моя броня не чувствует урона. Попробуй использовать сложные логические условия (IF/THEN/ELSE)!`;
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
        judgeReason: verdict.reason
      });
    }

    // AI Provider Integration (NVIDIA or OpenAI)
    // SOUL: the lesson persona (curriculum.ts) drives the tutor's in-lesson BEHAVIOR
    // (lesson2 IF/THEN rule, lesson3 cipher, lesson5 boss, etc). It is COMBINED with —
    // never replaces — the monster persona (skin/name) and the child-safety framing.
    // Keyed off serverStepId (authoritative, non-spoofable); null => free chat / no lesson.
    const lessonPersona = getLessonPersona(serverStepId);

    const baseInstruction = `
      Ты - дружелюбный, воодушевляющий игровой напарник по обучению программированию для ребенка 9-14 лет.
      Сейчас ты отыгрываешь облик: "${activeSkin} ${activeMonsterName}".

      ТВОИ ПРАВИЛА:
      1. Отвечай коротко - максимум 2-3 предложения. Язык общения: русский.
      2. Веди себя в соответствии со своей ролью (${activeMonsterName}). Используй эмодзи.
      3. Никогда не говори на взрослые темы, политику, религию, насилие. Если ребенок пытается обсудить это, вежливо откажись и верни его к уроку.
      4. Помогай ребенку с заданиями, но не давай готовое решение сразу. Задавай наводящие вопросы.
      5. Если ребенок попросил тебя шифровать слова (Шаг 3), выполняй его инструкции.
    `;

    // Combine: safety-framed base persona + the active lesson's pedagogy (if a lesson is
    // active). The lesson block is appended so the monster PLAYS the lesson, but the base
    // rules above (esp. rule 3 safety) still bound its behavior.
    const systemInstruction = lessonPersona
      ? `${baseInstruction}
      РОЛЬ ТЕКУЩЕГО УРОКА (отыгрывай её ПОВЕРХ облика "${activeMonsterName}", но НЕ нарушая правил безопасности выше):
      ${lessonPersona}
    `
      : baseInstruction;

    const openAiMessages = [
      { role: "system", content: systemInstruction },
      ...messages.map((m: any) => ({
        role: m.sender === "user" ? "user" : "assistant",
        // COPPA: minimize identifiable child text before it leaves for the tutor LLM
        content: m.sender === "user" ? minimizeChildText(m.text) : m.text
      }))
    ];

    const response = await ai.client.chat.completions.create({
      model: ai.model,
      messages: openAiMessages as any,
      max_tokens: 150,
      temperature: 0.7,
    });

    let aiMessageText = response.choices[0]?.message?.content || "Монстр задумался... Попробуй ещё раз!";

    // P0-2 SAFETY: real classifier moderation on the AI OUTPUT before it reaches the child —
    // catches the model emitting/translating insults or unsafe content, in any language.
    const outMod = await moderate(ai.client, ai.model, aiMessageText);
    if (!outMod.safe) {
      console.warn(`[MODERATION] output blocked (${outMod.source}: ${outMod.category})`);
      aiMessageText = "Ой, давай поговорим о чём-нибудь добром и по теме урока! 🐲";
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
      judgeReason: verdict.reason
    });

  } catch (error: any) {
    // SECURITY: Do not leak raw error messages to the client
    // NV1: never log the raw error/body — it can contain the child's message. Type only.
    console.error("[chat] LLM error:", (error as any)?.name ?? "Error", (error as any)?.status ?? "");
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

