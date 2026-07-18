import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

interface WeeklyReportProps {
  parentName: string;
  childName: string;
  monsterName: string;
  monsterEmoji: string;
  lessonsCompleted: number;
  totalLessons: number;
  xpEarned: number;
  crystalsEarned: number;
  monsterMood: number;
  streak: number;
}

export default function WeeklyReport({
  parentName = "Hörmətli valideyn",
  childName = "Uşaq",
  monsterName = "Огняш",
  monsterEmoji = "🐉",
  lessonsCompleted = 3,
  totalLessons = 5,
  xpEarned = 450,
  crystalsEarned = 45,
  monsterMood = 75,
  streak = 5,
}: WeeklyReportProps) {
  const moodLabel =
    monsterMood >= 70
      ? "Счастлив 😊"
      : monsterMood >= 40
        ? "Скучает 😐"
        : "Грустит 😢";

  return (
    <Html>
      <Head />
      <Preview>{`${childName} прошёл ${lessonsCompleted} из ${totalLessons} уроков на этой неделе`}</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Section style={headerStyle}>
            <Text style={logoStyle}>M</Text>
            <Heading style={headingStyle}>MindShift Academy</Heading>
            <Text style={subtitleStyle}>Еженедельный отчёт об обучении</Text>
          </Section>

          <Section style={contentStyle}>
            <Text style={greetingStyle}>Salam, {parentName}!</Text>

            <Text style={textStyle}>
              Вот результаты обучения {childName} за эту неделю.
              Ваш ребёнок учится общаться с искусственным интеллектом
              через игру с питомцем {monsterEmoji} {monsterName}.
            </Text>

            <Section style={statsGridStyle}>
              <Section style={statCardStyle}>
                <Text style={statNumberStyle}>{lessonsCompleted}/{totalLessons}</Text>
                <Text style={statLabelStyle}>Уроков пройдено</Text>
              </Section>
              <Section style={statCardStyle}>
                <Text style={statNumberStyle}>+{xpEarned}</Text>
                <Text style={statLabelStyle}>Опыта получено</Text>
              </Section>
              <Section style={statCardStyle}>
                <Text style={statNumberStyle}>💎 {crystalsEarned}</Text>
                <Text style={statLabelStyle}>Кристаллов</Text>
              </Section>
              <Section style={statCardStyle}>
                <Text style={statNumberStyle}>{streak} 🔥</Text>
                <Text style={statLabelStyle}>Дней подряд</Text>
              </Section>
            </Section>

            <Section style={moodSectionStyle}>
              <Text style={moodTitleStyle}>Настроение питомца: {moodLabel}</Text>
              <Text style={moodBarContainerStyle as React.CSSProperties}>
                <span
                  style={{
                    ...moodBarFillStyle,
                    width: `${monsterMood}%`,
                    backgroundColor:
                      monsterMood >= 70 ? "#10b981" : monsterMood >= 40 ? "#f59e0b" : "#d4b4ff",
                  }}
                />
              </Text>
              {monsterMood < 40 && (
                <Text style={moodWarningStyle}>
                  {monsterName} скучает по {childName}. Регулярные занятия
                  поднимут настроение питомца! Это не наказание — просто
                  напоминание, что {monsterName} ждёт.
                </Text>
              )}
            </Section>

            <Hr style={hrStyle} />

            <Text style={footerTextStyle}>
              Этот отчёт создан автоматически платформой MindShift Academy.
              Голос ребёнка мы не записываем.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const bodyStyle: React.CSSProperties = {
  backgroundColor: "#070b14",
  fontFamily: "'Geist', -apple-system, sans-serif",
  margin: 0,
  padding: "24px 0",
};

const containerStyle: React.CSSProperties = {
  maxWidth: "520px",
  margin: "0 auto",
  borderRadius: "24px",
  overflow: "hidden",
  border: "1px solid rgba(255,255,255,0.08)",
};

const headerStyle: React.CSSProperties = {
  backgroundColor: "#0d121f",
  padding: "32px 24px",
  textAlign: "center" as const,
};

const logoStyle: React.CSSProperties = {
  display: "inline-block",
  width: "36px",
  height: "36px",
  lineHeight: "36px",
  borderRadius: "12px",
  backgroundColor: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.1)",
  color: "#fff",
  fontSize: "16px",
  fontWeight: 600,
  textAlign: "center" as const,
  margin: "0 auto 12px",
};

const headingStyle: React.CSSProperties = {
  color: "#f5f7ff",
  fontSize: "22px",
  fontWeight: 700,
  margin: "0 0 4px",
};

const subtitleStyle: React.CSSProperties = {
  color: "rgba(255,255,255,0.5)",
  fontSize: "13px",
  margin: 0,
};

const contentStyle: React.CSSProperties = {
  backgroundColor: "#0d121f",
  padding: "24px",
};

const greetingStyle: React.CSSProperties = {
  color: "#f5f7ff",
  fontSize: "16px",
  fontWeight: 600,
  margin: "0 0 16px",
};

const textStyle: React.CSSProperties = {
  color: "rgba(255,255,255,0.7)",
  fontSize: "14px",
  lineHeight: "1.6",
  margin: "0 0 20px",
};

const statsGridStyle: React.CSSProperties = {
  margin: "0 0 20px",
};

const statCardStyle: React.CSSProperties = {
  display: "inline-block",
  width: "48%",
  padding: "12px",
  backgroundColor: "rgba(255,255,255,0.03)",
  borderRadius: "12px",
  border: "1px solid rgba(255,255,255,0.06)",
  textAlign: "center" as const,
  marginBottom: "8px",
};

const statNumberStyle: React.CSSProperties = {
  color: "#f5f7ff",
  fontSize: "20px",
  fontWeight: 800,
  margin: "0 0 2px",
};

const statLabelStyle: React.CSSProperties = {
  color: "rgba(255,255,255,0.45)",
  fontSize: "11px",
  fontWeight: 600,
  textTransform: "uppercase" as const,
  letterSpacing: "0.08em",
  margin: 0,
};

const moodSectionStyle: React.CSSProperties = {
  padding: "16px",
  backgroundColor: "rgba(139,92,246,0.06)",
  borderRadius: "16px",
  border: "1px solid rgba(139,92,246,0.12)",
  marginBottom: "20px",
};

const moodTitleStyle: React.CSSProperties = {
  color: "#f5f7ff",
  fontSize: "14px",
  fontWeight: 600,
  margin: "0 0 10px",
};

const moodBarContainerStyle = {
  display: "block",
  height: "8px",
  backgroundColor: "rgba(255,255,255,0.06)",
  borderRadius: "4px",
  overflow: "hidden",
  margin: "0 0 8px",
};

const moodBarFillStyle: React.CSSProperties = {
  display: "block",
  height: "100%",
  borderRadius: "4px",
  transition: "width 0.3s",
};

const moodWarningStyle: React.CSSProperties = {
  color: "#d4b4ff",
  fontSize: "12px",
  lineHeight: "1.5",
  margin: 0,
};

const hrStyle: React.CSSProperties = {
  borderColor: "rgba(255,255,255,0.06)",
  margin: "20px 0",
};

const footerTextStyle: React.CSSProperties = {
  color: "rgba(255,255,255,0.3)",
  fontSize: "11px",
  lineHeight: "1.5",
  margin: 0,
};
