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
import type { SkillMasteryRow } from "@/lib/parent-reports";

export type CompletionLetterProps = {
  parentName: string;
  recipientLabel: string;
  monsterName: string;
  certificateId: string;
  issuedDayBucket: string;
  masteryPerSkill: SkillMasteryRow[];
};

/** Parent completion letter — mastery summary + certificate reference. No child text. */
export default function CompletionLetter({
  parentName = "родитель",
  recipientLabel = "Участник MindShift V1",
  monsterName = "Спутник",
  certificateId = "",
  issuedDayBucket = "",
  masteryPerSkill = [],
}: CompletionLetterProps) {
  return (
    <Html>
      <Head />
      <Preview>Программа MindShift пройдена — сертификат готов</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Heading style={headingStyle}>Путь завершён</Heading>
          <Text style={textStyle}>Здравствуйте, {parentName}!</Text>
          <Text style={textStyle}>
            {recipientLabel} завершил(а) программу MindShift «Мышление». Спутник{" "}
            {monsterName} остаётся с ребёнком.
          </Text>

          <Section style={sectionStyle}>
            <Text style={sectionTitle}>Сводка мастерства</Text>
            {masteryPerSkill.map((row) => (
              <Text key={row.concept} style={textStyle}>
                {row.labelRu}: {Math.round(row.mastery * 100)}%
              </Text>
            ))}
          </Section>

          <Section style={sectionStyle}>
            <Text style={sectionTitle}>Сертификат</Text>
            <Text style={textStyle}>ID: {certificateId}</Text>
            <Text style={mutedStyle}>Дата: {issuedDayBucket}</Text>
            <Text style={mutedStyle}>
              Это запись о завершении программы, не внешняя аккредитация.
            </Text>
          </Section>

          <Hr style={hrStyle} />
          <Text style={mutedStyle}>
            Карточка-талисман монстра доступна в кабинете. Свободный текст ребёнка не
            хранится и не пересылается.
          </Text>
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
  color: "#e8eefc",
};
const containerStyle: React.CSSProperties = {
  maxWidth: "560px",
  margin: "0 auto",
  padding: "24px",
  backgroundColor: "#0e1422",
  borderRadius: "16px",
};
const headingStyle: React.CSSProperties = { color: "#fff", fontSize: "22px" };
const textStyle: React.CSSProperties = { color: "#d7def0", fontSize: "15px", lineHeight: 1.5 };
const mutedStyle: React.CSSProperties = { color: "#9aa6c2", fontSize: "13px", lineHeight: 1.5 };
const sectionStyle: React.CSSProperties = { marginTop: "20px" };
const sectionTitle: React.CSSProperties = {
  color: "#c4b5fd",
  fontSize: "14px",
  fontWeight: 700,
  marginBottom: "8px",
};
const hrStyle: React.CSSProperties = { borderColor: "#1f2a44", marginTop: "24px" };
