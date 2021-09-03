import os from 'os';
import { author, description, name, version } from '../../package.json';

const cluster = os.hostname();
const mode = process.env.NODE_ENV;
export const clusterInfo = {
  name,
  description,
  version,
  mode,
  author,
  cluster,
};
