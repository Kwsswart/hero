import { Helpers } from '@ulixee/hero-testing/index';
import { ITestKoaServer } from '@ulixee/hero-testing/helpers';
import Core, { Session } from '@ulixee/hero-core';
import TimetravelTicks from '../player/TimetravelTicks';

let koaServer: ITestKoaServer;
beforeAll(async () => {
  koaServer = await Helpers.runKoaServer();
  koaServer.get('/api-test', ctx => {
    ctx.body = `<body>
<a href="#" onclick="addMe()">I am a test</a>
<script>
function addMe() {
  const elem = document.createElement('A');
  elem.setAttribute('id', 'link2');
  elem.setAttribute('href', '/test2');
  document.body.append(elem);
  return false;
}
</script>
</body>`;
  });
});
afterEach(Helpers.afterEach);
afterAll(Helpers.afterAll);

describe('basic Timetravel Ticks tests', () => {
  let sessionId: string;
  beforeAll(async () => {
    const connection = Core.addConnection();
    Helpers.onClose(() => connection.disconnect());
    const meta = await connection.createSession({
      scriptInstanceMeta: {
        startDate: Date.now(),
        workingDirectory: process.cwd(),
        entrypoint: 'testEntrypoint.js',
        id: '1234',
      },
    });
    const tab = Session.getTab(meta);
    sessionId = meta.sessionId;
    await tab.goto(`${koaServer.baseUrl}/api-test`);
    await tab.waitForLoad('DomContentLoaded');
    await tab.interact([{ command: 'click', mousePosition: ['document', ['querySelector', 'a']] }]);
    await Helpers.waitForElement(
      ['document', ['querySelector', 'a#link2']],
      tab.mainFrameEnvironment,
    );
    await tab.session.close();
    await Core.shutdown();
  });

  it('can get the ticks for a session', async () => {
    const tabDetails = TimetravelTicks.loadFromDb(sessionId).tabs;
    expect(tabDetails).toHaveLength(1);
    expect(tabDetails[0].ticks.length).toBeGreaterThanOrEqual(4);
    expect(tabDetails[0].ticks.filter(x => x.isMajor)).toHaveLength(4);
    expect(tabDetails[0].ticks.filter(x => x.isNewDocumentTick)).toHaveLength(1);
    expect(tabDetails[0].domRecording.paintEvents.length).toBeGreaterThanOrEqual(1);
    expect(tabDetails[0].ticks.filter(x => x.eventType === 'command')).toHaveLength(4);
    expect(tabDetails[0].mouse.length).toBeGreaterThanOrEqual(1);
  });
});
