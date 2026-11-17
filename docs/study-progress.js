export function cleanStudy(value) {
  const previous = value && typeof value === 'object' ? value : {};
  const answers = Array.isArray(previous.answers) ? previous.answers.slice(0, 8) : [];
  return {
    position: typeof previous.position === 'string' && /^[a-z0-9-]{1,22}$/u.test(previous.position) ? previous.position : '',
    full: previous.full === true,
    answers: Array.from(answers, (answer) => Number.isInteger(answer) && answer >= 0 && answer < 8 ? answer : null),
    practice: typeof previous.practice === 'string' ? previous.practice.slice(0, 4000) : '',
    finished: previous.finished === true && hasPractice(previous.practice)
  };
}

export function hasPractice(text) {
  return typeof text === 'string' && text.replace(/\s/gu, '').length >= 8 && /[\p{L}\p{N}]/u.test(text);
}

export function hasStudy(study) {
  return Boolean(study && (study.practice || study.answers?.some(Number.isInteger) || study.finished));
}

export function canFinish(study, quiz) {
  return hasPractice(study?.practice) && quiz.length > 0 && quiz.every((question, index) => study.answers?.[index] === question.correct);
}

export function lessonSteps(lesson) {
  const steps = lesson.teach.map(({ title }, index) => ({ id: `idea-${index + 1}`, title }));
  steps.push({ id: 'example', title: lesson.case.title });
  if (lesson.lab) steps.push({ id: 'lab', title: '交互实验' });
  steps.push({ id: 'practice', title: '自己做一遍' });
  if (lesson.checkpoint) steps.push({ id: 'project', title: '阶段项目自检' });
  steps.push({ id: 'check', title: '理解检查' });
  return steps;
}
