import { lessons01to09 } from './lessons-01-09.js?v=guided-2';
import { lessons10to18 } from './lessons-10-18.js';
import { lessons19to28 } from './lessons-19-28.js?v=guided-2';
import { checkpoints } from './checkpoints.js';

const content = { ...lessons01to09, ...lessons10to18, ...lessons19to28 };
export const lessons = Object.fromEntries(Object.entries(content).map(([week, lesson]) => [week, {
  ...lesson,
  ...(checkpoints[week] ? { checkpoint: checkpoints[week] } : {})
}]));
