import { NextResponse } from "next/server";
import OpenAI from "openai";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Initialize Upstash Redis
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || "https://dummy-url.upstash.io",
  token: process.env.UPSTASH_REDIS_REST_TOKEN || "dummy-token",
});

// Create a new ratelimiter, that allows 10 requests per 10 seconds
const ratelimit = new Ratelimit({
  redis: redis,
  limiter: Ratelimit.slidingWindow(10, "10 s"),
});

// Zod Schema for validation
const chatRequestSchema = z.object({
  messages: z.array(
    z.object({
      sender: z.enum(["user", "assistant"]),
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

function isSafePrompt(prompt: string): boolean {
  const lowercase = prompt.toLowerCase();
  return !BLOCKLIST.some(word => lowercase.includes(word));
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
    // 1. Rate Limiting
    const ip = req.headers.get("x-forwarded-for") ?? "127.0.0.1";
    if (process.env.UPSTASH_REDIS_REST_URL) {
      const { success } = await ratelimit.limit(ip);
      if (!success) {
        return NextResponse.json({ error: "Rate limit exceeded. Please wait." }, { status: 429 });
      }
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

    // Fetch or create User
    const { auth } = await import("@clerk/nextjs/server");
    const { userId: clerkId } = await auth();
    let dbUser;
    if (clerkId) {
      dbUser = await prisma.user.findUnique({
        where: { clerkId },
      });
    }

    if (!dbUser) {
      dbUser = await prisma.user.findUnique({
        where: { username: "Uchenik" },
      });
      if (!dbUser) {
        dbUser = await prisma.user.create({
          data: {
            username: "Uchenik",
            xp: 450,
            crystals: 120,
            streak: 3,
            activeStep: 2,
          },
        });
      }
    }

    const ai = (await import("@/lib/ai-provider")).getAIClient();
    const challengeCompleted = checkChallengeSuccess(userPrompt, activeStepId);

    if (challengeCompleted) {
      await updateUserRewards(dbUser.id, activeStepId);
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
        challengeCompleted
      });
    }

    // AI Provider Integration (NVIDIA or OpenAI)
    const systemInstruction = `
      Ты - дружелюбный, воодушевляющий игровой напарник по обучению программированию для ребенка 9-14 лет.
      Сейчас ты отыгрываешь облик: "${activeSkin} ${activeMonsterName}".
      
      ТВОИ ПРАВИЛА:
      1. Отвечай коротко - максимум 2-3 предложения. Язык общения: русский.
      2. Веди себя в соответствии со своей ролью (${activeMonsterName}). Используй эмодзи.
      3. Никогда не говори на взрослые темы, политику, религию, насилие. Если ребенок пытается обсудить это, вежливо откажись и верни его к уроку.
      4. Помогай ребенку с заданиями, но не давай готовое решение сразу. Задавай наводящие вопросы.
      5. Если ребенок попросил тебя шифровать слова (Шаг 3), выполняй его инструкции.
    `;

    const openAiMessages = [
      { role: "system", content: systemInstruction },
      ...messages.map((m: any) => ({
        role: m.sender === "user" ? "user" : "assistant",
        content: m.text
      }))
    ];

    const response = await ai.client.chat.completions.create({
      model: ai.model,
      messages: openAiMessages as any,
      max_tokens: 150,
      temperature: 0.7,
    });

    const aiMessageText = response.choices[0]?.message?.content || "Извини, произошел сбой. Попробуй еще раз!";
    
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
      challengeCompleted
    });

  } catch (error: any) {
    // SECURITY: Do not leak raw error messages to the client
    console.error("OpenAI API Error:", error.message || error);
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

