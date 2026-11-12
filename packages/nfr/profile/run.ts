import { profileApi } from './api.ts';
import { profileWeb } from './web.ts';

await profileApi();

await profileWeb();
