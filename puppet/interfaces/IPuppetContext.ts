import { URL } from 'url';
import { ICookie } from '@secret-agent/core-interfaces/ICookie';
import { ITypedEventEmitter } from '@secret-agent/commons/eventUtils';
import { IPuppetPage } from './IPuppetPage';
import IBrowserEmulation from './IBrowserEmulation';

export default interface IPuppetContext extends ITypedEventEmitter<IPuppetContextEvents> {
  emulation: IBrowserEmulation;
  newPage(): Promise<IPuppetPage>;
  close(): Promise<void>;

  getCookies(url?: URL): Promise<ICookie[]>;
  addCookies(cookies: ICookie[], origins?: string[]): Promise<void>;
}

export interface IPuppetContextEvents {
  page: { page: IPuppetPage };
}
