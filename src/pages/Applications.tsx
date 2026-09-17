import { useLayoutEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useLanguage } from "../context/LanguageContext";
import { PageHero } from "../components/PageHero";
import { CableGutters } from "../components/CableGutters";
import { SectionHeading } from "../components/SectionHeading";
import { Reveal } from "../components/Reveal";
import { getApplicationForms, type CommitteeId, type Question } from "../data/applicationForms";
import { refreshScrollLimits, scrollToTop } from "../lib/lenisInstance";

type AnswerValue = string | string[];
type Answers = Record<string, AnswerValue>;

function isEmpty(value: AnswerValue | undefined): boolean {
  if (value === undefined) return true;
  if (Array.isArray(value)) return value.length === 0;
  return value.trim().length === 0;
}

function QuestionField({
  question,
  value,
  invalid,
  onChange,
}: {
  question: Question;
  value: AnswerValue | undefined;
  invalid: boolean;
  onChange: (value: AnswerValue) => void;
}) {
  const inputClass = invalid ? "form-field__control form-field__control--invalid" : "form-field__control";

  switch (question.tip) {
    case "kisa_metin":
      return (
        <input
          type="text"
          className={inputClass}
          value={(value as string) ?? ""}
          onChange={(event) => onChange(event.target.value)}
        />
      );
    case "eposta":
      return (
        <input
          type="email"
          className={inputClass}
          value={(value as string) ?? ""}
          onChange={(event) => onChange(event.target.value)}
        />
      );
    case "telefon":
      return (
        <input
          type="tel"
          className={inputClass}
          value={(value as string) ?? ""}
          onChange={(event) => onChange(event.target.value)}
        />
      );
    case "uzun_metin":
      return (
        <textarea
          className={inputClass}
          rows={4}
          value={(value as string) ?? ""}
          onChange={(event) => onChange(event.target.value)}
        />
      );
    case "tekli_secim": {
      const current = (value as string) ?? "";
      return (
        <div className="option-group" role="radiogroup">
          {question.secenekler?.map((option) => (
            <button
              key={option}
              type="button"
              className={"option-pill" + (current === option ? " option-pill--active" : "")}
              role="radio"
              aria-checked={current === option}
              onClick={() => onChange(option)}
            >
              {option}
            </button>
          ))}
        </div>
      );
    }
    case "coklu_secim": {
      const current = (value as string[]) ?? [];
      return (
        <div className="option-group">
          {question.secenekler?.map((option) => {
            const active = current.includes(option);
            return (
              <button
                key={option}
                type="button"
                className={"option-pill" + (active ? " option-pill--active" : "")}
                aria-pressed={active}
                onClick={() =>
                  onChange(active ? current.filter((item) => item !== option) : [...current, option])
                }
              >
                {option}
              </button>
            );
          })}
        </div>
      );
    }
    case "olcek_1_5": {
      const current = (value as string) ?? "";
      return (
        <div className="scale-group" role="radiogroup">
          {["1", "2", "3", "4", "5"].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={current === n}
              className={"scale-pill" + (current === n ? " scale-pill--active" : "")}
              onClick={() => onChange(n)}
            >
              {n}
            </button>
          ))}
        </div>
      );
    }
    case "coklu_secim_siralamali": {
      const current = (value as string[]) ?? [];
      return (
        <div className="option-group option-group--ranked">
          {question.secenekler?.map((option) => {
            const rank = current.indexOf(option);
            const active = rank !== -1;
            return (
              <button
                key={option}
                type="button"
                className={"option-pill option-pill--ranked" + (active ? " option-pill--active" : "")}
                aria-pressed={active}
                onClick={() =>
                  onChange(active ? current.filter((item) => item !== option) : [...current, option])
                }
              >
                <span className="option-pill__rank">{active ? rank + 1 : ""}</span>
                {option}
              </button>
            );
          })}
        </div>
      );
    }
    default:
      return null;
  }
}

function QuestionBlock({ number, children }: { number: number; children: ReactNode }) {
  return (
    <Reveal>
      <div className="question-block">
        <span className="question-block__num">/ {String(number).padStart(2, "0")}</span>
        <div className="question-block__body">{children}</div>
      </div>
    </Reveal>
  );
}

export function Applications() {
  const { t, lang } = useLanguage();
  const [answers, setAnswers] = useState<Answers>({});
  const [invalidIds, setInvalidIds] = useState<Set<string>>(new Set());
  const [selectedCommittee, setSelectedCommittee] = useState<CommitteeId | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const formSectionRef = useRef<HTMLElement>(null);

  const formsData = useMemo(() => getApplicationForms(lang), [lang]);
  const selectedForm = selectedCommittee ? formsData.formlar[selectedCommittee] : undefined;
  const commonCount = formsData.ortakSorular.length;

  // Selecting a committee (or submitting) changes the document's height in
  // place, which Lenis can't detect on its own here — see lenisInstance.ts.
  useLayoutEffect(() => {
    refreshScrollLimits();
  }, [selectedCommittee, submitted]);

  function setAnswer(id: string, value: AnswerValue) {
    setAnswers((prev) => ({ ...prev, [id]: value }));
    setInvalidIds((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  function selectCommittee(id: CommitteeId) {
    setSelectedCommittee(id);
    setInvalidIds(new Set());
    setAnswers((prev) => {
      const next = { ...prev };
      for (const cid of Object.keys(formsData.formlar) as CommitteeId[]) {
        for (const question of formsData.formlar[cid].ozelSorular) {
          delete next[question.id];
        }
      }
      return next;
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const questions = [...formsData.ortakSorular, ...(selectedForm?.ozelSorular ?? [])];
    const nextInvalid = new Set<string>();
    for (const question of questions) {
      if (question.zorunlu && isEmpty(answers[question.id])) {
        nextInvalid.add(question.id);
      }
    }
    if (nextInvalid.size > 0) {
      setInvalidIds(nextInvalid);
      const firstInvalidEl = document.getElementById(`question-${Array.from(nextInvalid)[0]}`);
      firstInvalidEl?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setSubmitted(true);
    scrollToTop({ immediate: true });
  }

  function renderQuestion(question: Question) {
    return (
      <label className="form-field" id={`question-${question.id}`}>
        <span className="form-field__label">
          {question.soru}
          {question.zorunlu && <span className="form-field__required">*</span>}
        </span>
        {question.yardimciMetin && <span className="form-field__hint">{question.yardimciMetin}</span>}
        <QuestionField
          question={question}
          value={answers[question.id]}
          invalid={invalidIds.has(question.id)}
          onChange={(value) => setAnswer(question.id, value)}
        />
        {invalidIds.has(question.id) && (
          <span className="form-field__error">{t.applications.form.required}</span>
        )}
      </label>
    );
  }

  return (
    <>
      <PageHero title={t.applications.heroTitle} subtitle={t.applications.heroSubtitle} />

      <CableGutters leftFolder="cable-left" rightFolder="cable-right" frameCount={141} triggerRef={formSectionRef} />

      <section className="section application-form-page" ref={formSectionRef}>
        <div className="container container--narrow">
          {submitted ? (
            <Reveal className="form-success-page">
              <span className="form-success-page__mark">✓</span>
              <h2>{t.applications.form.success}</h2>
            </Reveal>
          ) : (
            <>
              <SectionHeading
                kicker={t.applications.form.eyebrow}
                title={t.applications.closingTitle}
                subtitle={t.applications.closingText}
              />
              <p className="note">{t.applications.closingNote}</p>

              <form className="question-form-page" onSubmit={handleSubmit} noValidate>
                {formsData.ortakSorular.map((question, index) => (
                  <QuestionBlock number={index + 1} key={question.id}>
                    {renderQuestion(question)}
                  </QuestionBlock>
                ))}

                <QuestionBlock number={commonCount + 1}>
                  <span className="form-field__label" id="question-komite_secimi">
                    {t.applications.form.committeeQuestion}
                    <span className="form-field__required">*</span>
                  </span>
                  <div className="komite-choice-grid" role="radiogroup" aria-label={t.applications.form.committeeQuestion}>
                    {t.applications.committees.map((committee) => (
                      <button
                        key={committee.id}
                        type="button"
                        role="radio"
                        aria-checked={selectedCommittee === committee.id}
                        className={
                          "komite-card komite-card--choice" +
                          (selectedCommittee === committee.id ? " komite-card--selected" : "")
                        }
                        onClick={() => selectCommittee(committee.id as CommitteeId)}
                      >
                        <span className="komite-card__check" aria-hidden="true">
                          ✓
                        </span>
                        <h3>{committee.name}</h3>
                        <p>{committee.description}</p>
                      </button>
                    ))}
                  </div>
                </QuestionBlock>

                {selectedForm && (
                  <div key={selectedCommittee}>
                    {selectedForm.ozelSorular.map((question, index) => (
                      <QuestionBlock number={commonCount + 2 + index} key={question.id}>
                        {renderQuestion(question)}
                      </QuestionBlock>
                    ))}

                    <Reveal>
                      <div className="question-form-page__submit">
                        <button type="submit" className="btn btn--primary">
                          {t.applications.form.submit}
                        </button>
                        <p className="note">{t.applications.form.note}</p>
                      </div>
                    </Reveal>
                  </div>
                )}
              </form>
            </>
          )}
        </div>
      </section>
    </>
  );
}
