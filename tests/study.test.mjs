import assert from 'node:assert/strict';
import test from 'node:test';
import { weeks } from '../docs/data/curriculum.js';
import { lessons } from '../docs/data/lessons.js';
import { calculateBudget, funnelNumbers, jumpSucceeds, labLabels } from '../docs/labs.js';
import { initialPrototypeState, runPrototypeEvent } from '../docs/prototype-lab.js';
import { analyzePracticeLog } from '../docs/research-lab.js';
import { cleanRecords, emptyRecord, mergeWeek } from '../docs/records.js';
import { canFinish, cleanStudy, hasStudy, lessonSteps } from '../docs/study-progress.js';

function assertText(value, label) {
  assert.equal(typeof value, 'string', label);
  assert.ok(value.trim(), label);
}

test('all 28 weeks include on-site instruction, a worked case, practice, and usable quiz feedback', () => {
  assert.equal(weeks.length, 28);
  assert.deepEqual(Object.keys(lessons).map(Number), weeks.map(({ id }) => id));
  for (const { id } of weeks) {
    const { goal, teach, case: example, activity, quiz } = lessons[id];
    assertText(goal, `week ${id} goal`);
    assert.ok(teach.length >= 3, `week ${id} teaching sequence`);
    for (const item of teach) {
      assertText(item.title, `week ${id} explanation title`);
      assertText(item.text, `week ${id} explanation`);
    }
    assertText(example.title, `week ${id} case title`);
    assertText(example.text, `week ${id} case`);
    for (const row of example.rows ?? []) {
      assert.equal(row.length, 2, `week ${id} case row`);
      row.forEach((cell) => assertText(cell, `week ${id} case field`));
    }
    for (const field of ['title', 'prompt', 'hint', 'placeholder', 'sample']) {
      assertText(activity[field], `week ${id} practice ${field}`);
    }
    assert.ok(activity.criteria.length >= 2, `week ${id} practice criteria`);
    activity.criteria.forEach((criterion) => assertText(criterion, `week ${id} criterion`));
    assert.ok(quiz.length >= 2, `week ${id} understanding check`);
    for (const question of quiz) {
      assertText(question.prompt, `week ${id} quiz prompt`);
      assert.ok(Number.isInteger(question.correct) && question.choices[question.correct], `week ${id} valid answer`);
      assert.ok(question.choices.length >= 2, `week ${id} number of choices`);
      assert.equal(new Set(question.choices.map(({ text }) => text)).size, question.choices.length, `week ${id} distinct choices`);
      for (const choice of question.choices) {
        assertText(choice.text, `week ${id} choice`);
        assertText(choice.feedback, `week ${id} choice feedback`);
      }
    }
  }
});

test('lessons order explanation, example, optional known lab, practice, and check', () => {
  const usedLabs = new Set();
  for (const lesson of Object.values(lessons)) {
    const expected = [...lesson.teach.map((_, index) => `idea-${index + 1}`), 'example'];
    if (lesson.lab) {
      assert.ok(Object.hasOwn(labLabels, lesson.lab), `unknown lab: ${lesson.lab}`);
      usedLabs.add(lesson.lab);
      expected.push('lab');
    }
    expected.push('practice');
    if (lesson.checkpoint) expected.push('project');
    assert.deepEqual(lessonSteps(lesson).map(({ id }) => id), [...expected, 'check']);
  }
  assert.deepEqual([...usedLabs].sort(), Object.keys(labLabels).sort());
});

test('supply arrives before demand and a zero ending stock can still mean full service', () => {
  const budget = calculateBudget({ opening: 5, supply: 2, demand: 3, turns: 6 });
  assert.deepEqual(budget.map(({ stock }) => stock), [4, 3, 2, 1, 0, 0]);
  assert.deepEqual(budget.map(({ shortage }) => shortage), [0, 0, 0, 0, 0, 1]);
  assert.deepEqual(budget.at(-1), { round: 6, stock: 0, shortage: 1 });
  assert.deepEqual(calculateBudget({ opening: 0, supply: 3, demand: 1, turns: 2 }), [
    { round: 1, stock: 2, shortage: 0 },
    { round: 2, stock: 4, shortage: 0 },
  ]);
});

test('stage projects require tangible evidence and transfer to a different context', () => {
  assert.deepEqual(Object.keys(lessons).filter((id) => lessons[id].checkpoint), ['4', '8', '15', '28']);
  for (const { checkpoint } of Object.values(lessons).filter((lesson) => lesson.checkpoint)) {
    assertText(checkpoint.artifact, 'artifact');
    assert.equal(checkpoint.checks.length, 3);
    assertText(checkpoint.transfer, 'transfer');
  }
});

test('prototype rule distinguishes approach from interaction, boundary, failure, and reset', () => {
  let state = initialPrototypeState();
  const rules = { pickupTrigger: 'interact', distanceComparison: 'inclusive', pickupDistance: 40, pickupPhase: 'playing', pickupAction: 'collect', doorCondition: 'requires-box', doorAction: 'open', resetBox: true, resetCount: true, resetDoor: true };
  const act = (type, distance) => { state = runPrototypeEvent(state, rules, { type, distance }).state; };
  act('approach', 41);
  act('interact');
  assert.equal(state.count, 0);
  act('approach', 40);
  assert.equal(state.count, 0);
  act('interact');
  assert.equal(state.count, 1);
  act('interact');
  assert.equal(state.count, 1);
  act('door');
  act('exit');
  assert.equal(state.phase, 'complete');
  act('restart');
  assert.deepEqual(state, initialPrototypeState());
  act('approach', 39);
  act('fail');
  act('interact');
  assert.equal(state.count, 0);
});

test('raw event exercise separates duplicates, repeat runs, assistance, and unknown endings', () => {
  const all = analyzePracticeLog({ version: 'A', unit: 'session', deduplicate: true });
  const first = analyzePracticeLog({ version: 'A', unit: 'first', deduplicate: true });
  assert.deepEqual(all, { starts: 5, independent: 2, assisted: 1, exited: 1, unknown: 1, pickups: 4 });
  assert.deepEqual(first, { starts: 4, independent: 1, assisted: 1, exited: 1, unknown: 1, pickups: 3 });
  assert.equal(analyzePracticeLog({ version: 'A', unit: 'first', deduplicate: false }).pickups, 4);
  assert.equal(analyzePracticeLog({ version: 'B', unit: 'first', deduplicate: true }).starts, 1);
});

test('a jump at the grace boundary succeeds while a later input fails', () => {
  assert.equal(jumpSucceeds(65, 50), false);
  assert.equal(jumpSucceeds(65, 65), true);
  assert.equal(jumpSucceeds(66, 65), false);
  assert.equal(jumpSucceeds(0, 0), true);
  assert.equal(jumpSucceeds(-20, 0), true);
});

test('funnel totals preserve each cohort and use people entering the selected stage as the denominator', () => {
  const originalNew = funnelNumbers('a', 'new');
  const revisedNew = funnelNumbers('b', 'new');
  const originalExperienced = funnelNumbers('a', 'experienced');
  const revisedExperienced = funnelNumbers('b', 'experienced');
  const ratios = (values) => values.slice(1).map((count, index) => `${count}/${values[index]}`);
  assert.deepEqual(ratios(originalNew), ['3/5', '2/3', '1/2']);
  assert.deepEqual(ratios(revisedNew), ['5/5', '4/5', '3/4']);
  assert.equal(originalExperienced.at(-1) / originalExperienced[0], revisedExperienced.at(-1) / revisedExperienced[0]);
  assert.deepEqual(funnelNumbers('a', 'all'), originalNew.map((count, index) => count + originalExperienced[index]));
  assert.deepEqual(funnelNumbers('b', 'all'), revisedNew.map((count, index) => count + revisedExperienced[index]));
});

test('course completion requires the learner’s practice and both correct answers', () => {
  const { quiz } = lessons[1];
  const answers = quiz.map(({ correct }) => correct);
  const practice = '我观察玩家先回头查看线索';
  assert.equal(canFinish({ practice, answers }, quiz), true);
  assert.equal(canFinish({ practice, answers: answers.slice(0, 1) }, quiz), false);
  assert.equal(canFinish({ practice, answers: [null, answers[1]] }, quiz), false);
  assert.equal(canFinish({ practice: '还没写', answers }, quiz), false);
  assert.equal(canFinish({ practice, answers: [] }, []), false);
});

test('old checkpoints retain verification and do not imply course completion', () => {
  const project = {
    draft: '门锁需要在踩板后开启。',
    rationale: '希望规则因果关系清晰。',
    evidence: '玩家看向门前的状态变化。',
    verification: '已亲自走通停止与重试。',
    locked: true,
    complete: true,
  };
  const migrated = cleanRecords({ 10: project, 29: project });
  assert.deepEqual(migrated, { 10: { ...project, study: cleanStudy() } });
  assert.equal(hasStudy(migrated[10].study), false);
});

test('import can fill missing project or study records without overwriting existing work', () => {
  const existingStudy = cleanStudy({ position: 'lab', answers: [0, 2], practice: '我观察到三个不同玩家路径' });
  const importedStudy = cleanStudy({ position: 'check', answers: [1, 0], practice: '观察了冷却时长的影响' });
  const blank = emptyRecord();
  const project = { ...blank, draft: '导入的项目草案' };
  const study = { ...blank, study: existingStudy };
  const merged = { ...project, study: existingStudy };
  assert.deepEqual(mergeWeek(study, { ...project, study: importedStudy }), merged);
  assert.deepEqual(mergeWeek(project, study), merged);
  assert.deepEqual(mergeWeek(merged, { ...project, draft: '企图覆盖的项目', study: importedStudy }), merged);
  const browseOnly = { ...blank, study: cleanStudy({ position: 'idea-1' }) };
  assert.deepEqual(mergeWeek(browseOnly, { ...project, study: importedStudy }), { ...project, study: importedStudy });
  assert.deepEqual(mergeWeek(browseOnly, project), { ...project, study: browseOnly.study });
});
