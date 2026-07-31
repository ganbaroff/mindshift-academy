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

export type WeeklyReportV2Props = {
  parentName: string;
  childName: string;
  monsterName: string;
  week: number;
  masteryPerSkill: SkillMasteryRow[];
  struggledMost: SkillMasteryRow;
  dinnerQuestionRu: string;
  misconceptionRu: string;
};

/** Parent weekly report v2 — mastery / struggled-most / dinner question. No child text. */
export default function WeeklyReportV2({
  parentName = "родитель",
  childName = "ребёнок",
  monsterName = "Спутник",
  week = 1,
  masteryPerSkill = [],
  struggledMost = { concept: "", labelRu: "—", mastery: 0 },
  dinnerQuestionRu = "",
  misconceptionRu = "",
}: WeeklyReportV2Props) {
  return (
    <Html>
      <Head />
      <Preview>{`Неделя ${week}: отчёт о навыках ${childName}`}</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Heading style={headingStyle}>MindShift — неделя {week}</Heading>
          <Text style={textStyle}>Здравствуйте, {parentName}!</Text>
          <Text style={textStyle}>
            Краткий отчёт о пути {childName} со спутником {monsterName}.
          </Text>

          <Section style={sectionStyle}>
            <Text style={sectionTitle}>Мастерство по навыкам</Text>
            {masteryPerSkill.map((row) => (
              <Text key={row.concept} style={textStyle}>
                {row.labelRu}: {Math.round(row.mastery * 100)}%
              </Text>
            ))}
          </Section>

          <Section style={sectionStyle}>
            <Text style={sectionTitle}>Больше всего внимания на этой неделе</Text>
            <Text style={textStyle}>
              {struggledMost.labelRu} ({Math.round(struggledMost.mastery * 100)}%)
            </Text>
            <Text style={mutedStyle}>Идея недели: {misconceptionRu}</Text>
          </Section>

          <Section style={sectionStyle}>
            <Text style={sectionTitle}>Вопрос за ужином</Text>
            <Text style={textStyle}>{dinnerQuestionRu}</Text>
          </Section>

          <Hr style={hrStyle} />
          <Text style={mutedStyle}>
            Голос и свободный текст ребёнка в этом письме не передаются.
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
