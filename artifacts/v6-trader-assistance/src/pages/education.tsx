import { useEffect, useState } from "react";
import { getAccountStorageKey } from "../lib/account-storage";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  GraduationCap,
  Lightbulb,
  RotateCcw,
  Target,
  TrendingDown,
  TrendingUp,
  ShieldCheck,
} from "lucide-react";

type Lesson = {
  id: string;
  title: string;
  category: string;
  duration: string;
  description: string;
  content: { heading: string; body: string }[];
  question: string;
  answers: string[];
  correct: number;
  explanation: string;
};

const lessons: Lesson[] = [
  {
    id: "support",
    title: "Understanding Support",
    category: "Support & Resistance",
    duration: "5 min",
    description:
      "Learn to identify the floor where buying interest may appear.",
    content: [
      {
        heading: "What is support?",
        body: "Support is a price area where selling has previously slowed or buyers have stepped in. Think of it as a potential floor, not an unbreakable barrier.",
      },
      {
        heading: "How to mark it",
        body: "Look for an area where price has reacted multiple times. Mark the zone around the reactions instead of insisting on one perfect price.",
      },
      {
        heading: "What confirmation looks like",
        body: "Wait for price to reach the zone and observe its reaction. A rejection, a strong move away, or a change in market structure can provide clues—but none guarantees the next move.",
      },
    ],
    question:
      "Price returns to a support zone. What is the most sensible next step?",
    answers: [
      "Buy immediately because support cannot break.",
      "Observe the reaction and wait for confirmation.",
      "Ignore the chart and increase position size.",
    ],
    correct: 1,
    explanation:
      "Correct! Support can fail. Watching how price reacts helps you avoid treating a level as a guarantee.",
  },
  {
    id: "resistance",
    title: "Understanding Resistance",
    category: "Support & Resistance",
    duration: "5 min",
    description:
      "Learn to recognize a potential ceiling where selling may appear.",
    content: [
      {
        heading: "What is resistance?",
        body: "Resistance is a price area where upward movement has previously slowed or sellers have stepped in. It is a zone of possible selling pressure, not a guaranteed reversal.",
      },
      {
        heading: "Mark the reaction area",
        body: "Look for previous highs and repeated reactions. Several nearby highs may form one zone rather than several exact lines.",
      },
      {
        heading: "Read the context",
        body: "Consider the broader trend, the strength of the move into resistance, and whether price rejects or breaks through the zone.",
      },
    ],
    question:
      "Price reaches a resistance zone during an uptrend. What should you remember?",
    answers: [
      "Price must reverse at resistance.",
      "Resistance is irrelevant during an uptrend.",
      "Resistance may hold or break, so observe price behavior.",
    ],
    correct: 2,
    explanation:
      "Exactly. Resistance is an area to watch. Price can reject it or break above it.",
  },
  {
    id: "wicks",
    title: "Reading Rejection Wicks",
    category: "Price Action",
    duration: "6 min",
    description:
      "Understand what a candle wick can reveal about a price reaction.",
    content: [
      {
        heading: "What is a rejection wick?",
        body: "A long wick shows that price traded away from the candle's closing area before the candle finished. Near a key level, it may suggest that the move was rejected.",
      },
      {
        heading: "Location matters",
        body: "A lower wick near support may show buyers responding. An upper wick near resistance may show sellers responding. The same wick in the middle of nowhere may mean much less.",
      },
      {
        heading: "Wait for the candle to close",
        body: "An unfinished candle can change shape. Consider the candle close, nearby levels, and overall context instead of reacting to a wick alone.",
      },
    ],
    question:
      "A candle forms a long lower wick near support. What might it suggest?",
    answers: [
      "Price is guaranteed to rise.",
      "Buyers may have responded, but confirmation is still needed.",
      "The market is guaranteed to crash.",
    ],
    correct: 1,
    explanation:
      "Right. A lower wick can suggest rejection of lower prices, but it is not a standalone buy signal.",
  },
  {
    id: "breakouts",
    title: "Breakouts & False Breakouts",
    category: "Price Action",
    duration: "7 min",
    description:
      "Learn why breaking a level and holding beyond it are different things.",
    content: [
      {
        heading: "What is a breakout?",
        body: "A breakout happens when price moves beyond a level or zone that previously contained it.",
      },
      {
        heading: "Watch for acceptance",
        body: "A quick move through a level can reverse. Candle closes, follow-through, and how price behaves beyond the zone can help you assess whether the breakout is holding.",
      },
      {
        heading: "Avoid chasing",
        body: "A breakout can travel quickly and leave a poor entry. Missing a move is not a reason to abandon your rules or chase price.",
      },
    ],
    question:
      "Price briefly moves above resistance, then closes back below it. What might this be?",
    answers: [
      "A possible false breakout.",
      "Proof that price must rise.",
      "A guaranteed short entry.",
    ],
    correct: 0,
    explanation:
      "Correct. A move above resistance followed by a close back below may indicate a false breakout. Wait for more context.",
  },
  {
    id: "retests",
    title: "Break-and-Retest Setups",
    category: "Support & Resistance",
    duration: "7 min",
    description:
      "Study how a broken level can become an area to watch from the other side.",
    content: [
      {
        heading: "The basic idea",
        body: "After price breaks above resistance, that zone may act as support on a pullback. After price breaks below support, that zone may act as resistance.",
      },
      {
        heading: "Wait for the retest",
        body: "Price does not always return to a broken zone. If it does, watch whether it holds, rejects, or moves back through the level.",
      },
      {
        heading: "Plan risk first",
        body: "Before considering a setup, identify what would invalidate the idea and where risk would be controlled. A retest is a pattern to evaluate, not a guaranteed trade.",
      },
    ],
    question:
      "Price breaks below support and later returns to that zone from underneath. What may happen?",
    answers: [
      "The zone may act as resistance.",
      "The zone must become support again.",
      "The retest guarantees a profitable trade.",
    ],
    correct: 0,
    explanation:
      "Exactly. Former support may act as resistance, but price can also reclaim the zone.",
  },
];

const practiceScenarios = [
  {
    title: "Scenario 1 — Support Test",
    market: "FICTIONAL MARKET · TRAINING ONLY",
    description:
      "Price has fallen toward a support zone that produced two previous upward reactions. The current candle has not closed yet.",
    question: "What is the most disciplined choice?",
    answers: [
      "Buy before the candle closes.",
      "Wait to observe the reaction and candle close.",
      "Assume support has already failed.",
    ],
    correct: 1,
    explanation:
      "Waiting gives you more information. Neither a bounce nor a breakdown is confirmed by an unfinished candle.",
  },
  {
    title: "Scenario 2 — Resistance Break",
    market: "FICTIONAL MARKET · TRAINING ONLY",
    description:
      "Price moves above a resistance zone, but the next candle closes back inside the previous range.",
    question: "What should you consider?",
    answers: [
      "The breakout may have failed.",
      "The breakout is definitely valid.",
      "Enter immediately in either direction.",
    ],
    correct: 0,
    explanation:
      "A return into the range can signal a failed breakout. More price action is needed to understand what happens next.",
  },
  {
    title: "Scenario 3 — Downtrend Retest",
    market: "FICTIONAL MARKET · TRAINING ONLY",
    description:
      "Price has been making lower highs and lower lows. It breaks below support, then rallies back toward the broken zone.",
    question: "Which idea best fits the S&R framework?",
    answers: [
      "The old support may now act as resistance.",
      "A rally always means the downtrend has ended.",
      "Sell automatically without checking the reaction.",
    ],
    correct: 0,
    explanation:
      "A broken support zone may become resistance. Observe the reaction and define risk before considering any setup.",
  },
];

const storageKey = "v6-trading-academy-progress:v1";

function readProgress(userId: string): string[] {
  try {
    const saved = localStorage.getItem(getAccountStorageKey(storageKey, userId));
    const parsed: unknown = saved ? JSON.parse(saved) : [];
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

export default function EducationPage({
  onBack,
  userId,
}: {
  onBack?: () => void;
  userId: string;
}) {
  const [completed, setCompleted] = useState<string[]>(() => readProgress(userId));
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showPractice, setShowPractice] = useState(false);
  const [scenarioIndex, setScenarioIndex] = useState(0);
  const [practiceAnswer, setPracticeAnswer] = useState<number | null>(null);
  const [completedScenarios, setCompletedScenarios] = useState<number[]>([]);

  useEffect(() => {
    try {
      localStorage.setItem(
        getAccountStorageKey(storageKey, userId),
        JSON.stringify(completed),
      );
    } catch {
      // Progress remains available for this session if storage is unavailable.
    }
  }, [completed, userId]);

  const progress = Math.round((completed.length / lessons.length) * 100);
  const scenario = practiceScenarios[scenarioIndex];

  function openLesson(lesson: Lesson) {
    setSelectedLesson(lesson);
    setSelectedAnswer(null);
    setShowPractice(false);
  }

  function backToAcademy() {
    setSelectedLesson(null);
    setSelectedAnswer(null);
    setShowPractice(false);
    setPracticeAnswer(null);
  }

  const pageStyle: React.CSSProperties = {
    minHeight: "100%",
    padding: "28px",
    color: "#F1F5F9",
    background: "#0B1120",
    fontFamily: "inherit",
  };

  const cardStyle: React.CSSProperties = {
    background: "#111C30",
    border: "1px solid #24334D",
    borderRadius: "16px",
    padding: "20px",
  };

  const buttonStyle: React.CSSProperties = {
    border: "1px solid #334967",
    borderRadius: "10px",
    padding: "11px 14px",
    background: "#172740",
    color: "#EAF3FF",
    cursor: "pointer",
    fontWeight: 600,
  };

  return (
    <div style={pageStyle}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "16px",
          flexWrap: "wrap",
          marginBottom: "28px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div
            style={{
              width: 48,
              height: 48,
              display: "grid",
              placeItems: "center",
              borderRadius: 14,
              background: "#173A65",
              color: "#78B8FF",
            }}
          >
            <GraduationCap size={26} />
          </div>
          <div>
            <div
              style={{
                color: "#78B8FF",
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: 2,
              }}
            >
              V6 TRADER ASSISTANCE
            </div>
            <h1 style={{ fontSize: 28, margin: "4px 0", fontWeight: 750 }}>
              Trading Academy
            </h1>
          </div>
        </div>
        {onBack && (
          <button onClick={onBack} style={buttonStyle}>
            <ArrowLeft
              size={16}
              style={{ verticalAlign: "middle", marginRight: 7 }}
            />
            Back to Dashboard
          </button>
        )}
      </div>

      {selectedLesson ? (
        <div style={{ maxWidth: 850, margin: "0 auto" }}>
          <button
            onClick={backToAcademy}
            style={{ ...buttonStyle, marginBottom: 20 }}
          >
            <ArrowLeft
              size={16}
              style={{ verticalAlign: "middle", marginRight: 7 }}
            />
            All lessons
          </button>

          <div style={cardStyle}>
            <div style={{ color: "#78B8FF", fontSize: 13, fontWeight: 700 }}>
              {selectedLesson.category} · {selectedLesson.duration}
            </div>
            <h2 style={{ fontSize: 26, margin: "10px 0 22px" }}>
              {selectedLesson.title}
            </h2>

            {selectedLesson.content.map((section, index) => (
              <section key={section.heading} style={{ marginBottom: 22 }}>
                <h3 style={{ fontSize: 17, marginBottom: 8 }}>
                  {index + 1}. {section.heading}
                </h3>
                <p style={{ color: "#B9C7DA", lineHeight: 1.75, margin: 0 }}>
                  {section.body}
                </p>
              </section>
            ))}

            <div
              style={{
                borderTop: "1px solid #2A3A52",
                marginTop: 26,
                paddingTop: 22,
              }}
            >
              <h3 style={{ fontSize: 19, marginTop: 0 }}>
                <Lightbulb
                  size={19}
                  style={{
                    verticalAlign: "middle",
                    marginRight: 8,
                    color: "#78B8FF",
                  }}
                />
                Quick knowledge check
              </h3>
              <p style={{ color: "#D7E2F0", lineHeight: 1.6 }}>
                {selectedLesson.question}
              </p>
              <div style={{ display: "grid", gap: 10 }}>
                {selectedLesson.answers.map((answer, index) => {
                  const isChosen = selectedAnswer === index;
                  const isCorrect = index === selectedLesson.correct;
                  const answered = selectedAnswer !== null;
                  return (
                    <button
                      key={answer}
                      onClick={() => setSelectedAnswer(index)}
                      style={{
                        ...buttonStyle,
                        textAlign: "left",
                        background:
                          answered && isCorrect
                            ? "#153D32"
                            : isChosen
                              ? "#43262D"
                              : "#172740",
                        borderColor:
                          answered && isCorrect
                            ? "#32896A"
                            : isChosen
                              ? "#B85B6B"
                              : "#334967",
                      }}
                    >
                      {answer}
                    </button>
                  );
                })}
              </div>

              {selectedAnswer !== null && (
                <div
                  style={{
                    marginTop: 16,
                    padding: 14,
                    borderRadius: 10,
                    background: "#142A35",
                    color: "#C9E8F5",
                    lineHeight: 1.6,
                  }}
                >
                  <strong>
                    {selectedAnswer === selectedLesson.correct
                      ? "Correct!"
                      : "Not quite — keep learning!"}
                  </strong>
                  <p style={{ marginBottom: 0 }}>
                    {selectedLesson.explanation}
                  </p>
                </div>
              )}

              <button
                onClick={() => {
                  if (selectedAnswer === selectedLesson.correct) {
                    setCompleted((previous) =>
                      previous.includes(selectedLesson.id)
                        ? previous
                        : [...previous, selectedLesson.id],
                    );
                  }
                  backToAcademy();
                }}
                style={{
                  ...buttonStyle,
                  marginTop: 20,
                  background: "#2563A6",
                  borderColor: "#438CD3",
                }}
              >
                {completed.includes(selectedLesson.id)
                  ? "Return to Academy"
                  : "Finish Lesson"}
                <ChevronRight
                  size={16}
                  style={{ verticalAlign: "middle", marginLeft: 8 }}
                />
              </button>
              {selectedAnswer !== selectedLesson.correct &&
                selectedAnswer !== null && (
                  <p style={{ color: "#91A5BF", fontSize: 13 }}>
                    Choose the correct answer to record this lesson as complete.
                  </p>
                )}
            </div>
          </div>
        </div>
      ) : showPractice ? (
        <div style={{ maxWidth: 850, margin: "0 auto" }}>
          <button
            onClick={backToAcademy}
            style={{ ...buttonStyle, marginBottom: 20 }}
          >
            <ArrowLeft
              size={16}
              style={{ verticalAlign: "middle", marginRight: 7 }}
            />
            Academy home
          </button>
          <div style={cardStyle}>
            <div style={{ color: "#78B8FF", fontWeight: 700, fontSize: 12 }}>
              <Target
                size={15}
                style={{ verticalAlign: "middle", marginRight: 6 }}
              />
              {scenario.market}
            </div>
            <h2 style={{ fontSize: 25 }}>{scenario.title}</h2>
            <div
              style={{
                background: "#0B1425",
                border: "1px solid #283A55",
                borderRadius: 12,
                padding: 18,
                margin: "18px 0",
              }}
            >
              <p style={{ color: "#D1DEEE", lineHeight: 1.8, margin: 0 }}>
                {scenario.description}
              </p>
            </div>
            <h3>{scenario.question}</h3>
            <div style={{ display: "grid", gap: 10 }}>
              {scenario.answers.map((answer, index) => (
                <button
                  key={answer}
                  onClick={() => setPracticeAnswer(index)}
                  style={{
                    ...buttonStyle,
                    textAlign: "left",
                    background:
                      practiceAnswer !== null && index === scenario.correct
                        ? "#153D32"
                        : practiceAnswer === index
                          ? "#43262D"
                          : "#172740",
                  }}
                >
                  {answer}
                </button>
              ))}
            </div>

            {practiceAnswer !== null && (
              <div
                style={{
                  marginTop: 16,
                  padding: 14,
                  background: "#142A35",
                  borderRadius: 10,
                  lineHeight: 1.6,
                }}
              >
                <strong>
                  {practiceAnswer === scenario.correct
                    ? "Good read!"
                    : "Review the setup"}
                </strong>
                <p>{scenario.explanation}</p>
                <button
                  style={buttonStyle}
                  onClick={() => {
                    setCompletedScenarios((previous) =>
                      previous.includes(scenarioIndex)
                        ? previous
                        : [...previous, scenarioIndex],
                    );
                    setScenarioIndex(
                      (previous) => (previous + 1) % practiceScenarios.length,
                    );
                    setPracticeAnswer(null);
                  }}
                >
                  Next scenario{" "}
                  <ChevronRight size={15} style={{ verticalAlign: "middle" }} />
                </button>
                <button
                  style={{ ...buttonStyle, marginLeft: 8 }}
                  onClick={backToAcademy}
                >
                  Exit practice
                </button>
              </div>
            )}
            <p style={{ color: "#91A5BF", fontSize: 12, marginTop: 22 }}>
              Training simulation only. These scenarios are fictional and are
              not live market signals.
            </p>
          </div>
        </div>
      ) : (
        <>
          <div
            style={{
              ...cardStyle,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
              gap: 20,
              alignItems: "center",
              marginBottom: 24,
            }}
          >
            <div>
              <div style={{ color: "#9EB0C8", fontSize: 13 }}>
                YOUR LEARNING JOURNEY
              </div>
              <h2 style={{ fontSize: 23, margin: "8px 0" }}>
                Build your trading foundation.
              </h2>
              <p style={{ color: "#AFC0D5", lineHeight: 1.6, marginBottom: 0 }}>
                Learn to read levels, study price action, and practice patience
                before risking money.
              </p>
            </div>
            <div
              style={{ padding: 18, borderRadius: 12, background: "#0B1425" }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <span style={{ color: "#B9C7DA" }}>Course progress</span>
                <strong>{progress}%</strong>
              </div>
              <div
                style={{
                  height: 8,
                  background: "#27364D",
                  borderRadius: 99,
                  overflow: "hidden",
                  margin: "12px 0",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${progress}%`,
                    background: "#60A5FA",
                    transition: "width 200ms ease",
                  }}
                />
              </div>
              <div style={{ color: "#91A5BF", fontSize: 12 }}>
                {completed.length} of {lessons.length} lessons completed
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              marginBottom: 16,
            }}
          >
            <h2 style={{ fontSize: 21, margin: 0 }}>
              <BookOpen
                size={20}
                style={{
                  verticalAlign: "middle",
                  marginRight: 8,
                  color: "#78B8FF",
                }}
              />
              Your courses
            </h2>
            <button
              style={buttonStyle}
              onClick={() => {
                setCompleted([]);
                setCompletedScenarios([]);
              }}
              title="Reset course progress"
            >
              <RotateCcw
                size={14}
                style={{ verticalAlign: "middle", marginRight: 6 }}
              />
              Reset progress
            </button>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(235px, 1fr))",
              gap: 16,
            }}
          >
            {lessons.map((lesson, index) => (
              <button
                key={lesson.id}
                onClick={() => openLesson(lesson)}
                style={{
                  ...cardStyle,
                  color: "#F1F5F9",
                  textAlign: "left",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span
                    style={{
                      background: "#183557",
                      color: "#93C5FD",
                      padding: "5px 9px",
                      borderRadius: 8,
                      fontSize: 11,
                      fontWeight: 700,
                    }}
                  >
                    {lesson.category}
                  </span>
                  {completed.includes(lesson.id) ? (
                    <CheckCircle2 color="#55D6A5" size={20} />
                  ) : (
                    <span style={{ color: "#7186A2", fontSize: 12 }}>
                      LESSON {index + 1}
                    </span>
                  )}
                </div>
                <h3 style={{ fontSize: 18, margin: 0 }}>{lesson.title}</h3>
                <p
                  style={{
                    color: "#AFC0D5",
                    lineHeight: 1.6,
                    margin: 0,
                    flex: 1,
                  }}
                >
                  {lesson.description}
                </p>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    color: "#8EA7C5",
                    fontSize: 12,
                  }}
                >
                  <span>{lesson.duration}</span>
                  <span>
                    Open lesson{" "}
                    <ChevronRight
                      size={15}
                      style={{ verticalAlign: "middle" }}
                    />
                  </span>
                </div>
              </button>
            ))}
          </div>

          <div
            style={{
              ...cardStyle,
              marginTop: 26,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 18,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div
                style={{
                  background: "#183557",
                  color: "#93C5FD",
                  padding: 13,
                  borderRadius: 12,
                }}
              >
                <Target size={25} />
              </div>
              <div>
                <h2 style={{ margin: "0 0 6px", fontSize: 20 }}>
                  S&R Practice Lab
                </h2>
                <p style={{ margin: 0, color: "#AFC0D5", lineHeight: 1.5 }}>
                  Practice reading fictional scenarios without real-money
                  pressure.
                </p>
              </div>
            </div>
            <button
              style={{
                ...buttonStyle,
                background: "#2563A6",
                borderColor: "#438CD3",
              }}
              onClick={() => {
                setShowPractice(true);
                setSelectedLesson(null);
                setScenarioIndex(0);
                setPracticeAnswer(null);
              }}
            >
              Start practicing{" "}
              <ChevronRight size={16} style={{ verticalAlign: "middle" }} />
            </button>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 12,
              color: "#91A5BF",
              fontSize: 12,
              lineHeight: 1.7,
              marginTop: 24,
            }}
          >
            <ShieldCheck size={18} style={{ flexShrink: 0, marginTop: 2 }} />
            <p style={{ margin: 0 }}>
              Education only, not financial advice. Lessons use general concepts
              and fictional scenarios. No live prices, trading signals, or
              guaranteed outcomes are provided.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
