import { Helpers } from '@ulixee/hero-testing';
import { ITestKoaServer } from '@ulixee/hero-testing/helpers';
import ISessionCreateOptions from '@ulixee/hero-interfaces/ISessionCreateOptions';
import Core, { Tab } from '../index';
import ConnectionToClient from '../connections/ConnectionToClient';
import Session from '../lib/Session';

let koaServer: ITestKoaServer;
let connection: ConnectionToClient;
beforeAll(async () => {
  connection = Core.addConnection();
  await connection.connect();
  Helpers.onClose(() => connection.disconnect(), true);
  koaServer = await Helpers.runKoaServer();
});
afterAll(Helpers.afterAll);
afterEach(Helpers.afterEach);

describe('basic waitForElement tests', () => {
  it('waits for an element', async () => {
    koaServer.get('/waitForElementTest1', ctx => {
      ctx.body = `<body>
<script>
    setTimeout(function() {
      const elem = document.createElement('A');
      elem.setAttribute('href', '/waitForElementTest2');
      document.body.append(elem)
    }, 500);
</script>
</body>`;
    });

    const { tab } = await createSession();
    await tab.goto(`${koaServer.baseUrl}/waitForElementTest1`);

    await expect(tab.waitForElement(['document', ['querySelector', 'a']])).resolves.toMatchObject({
      id: expect.any(Number),
    });
  });

  it('times out waiting for an element', async () => {
    koaServer.get('/waitForElementTest2', ctx => {
      ctx.body = `<body><a>Nothing really here</a></body>`;
    });
    const { tab } = await createSession();
    await tab.goto(`${koaServer.baseUrl}/waitForElementTest2`);
    await tab.waitForLoad('DomContentLoaded');

    await expect(
      tab.waitForElement(['document', ['querySelector', 'a#notthere']], { timeoutMs: 500 }),
    ).rejects.toThrowError(/Timeout waiting for element to be visible/);
  });

  it('will wait for an element to be visible', async () => {
    koaServer.get('/waitForElementTest3', ctx => {
      ctx.body = `<body>
    <a id="waitToShow" href="/anywhere" style="display: none">Link</a>
<script>
    setTimeout(function() {
      document.querySelector('a#waitToShow').style.display = 'block';
    }, 150);
</script>
</body>`;
    });
    const { tab } = await createSession();
    await tab.goto(`${koaServer.baseUrl}/waitForElementTest3`);

    await expect(
      tab.waitForElement(['document', ['querySelector', 'a#waitToShow']], {
        waitForVisible: true,
      }),
    ).resolves.toMatchObject({
      id: expect.any(Number),
      type: 'HTMLAnchorElement',
    });
  });

  it('can customize which options to waitForVisible', async () => {
    koaServer.get('/waitForElementTestCustom', ctx => {
      ctx.body = `<body>
    <a id="waitToShow" href="/anywhere" style="margin-top:2500px; display: none">Link</a>
<script>
    setTimeout(function() {
      document.querySelector('a#waitToShow').style.display = 'block';
    }, 150);
</script>
</body>`;
    });
    const { tab } = await createSession();
    await tab.goto(`${koaServer.baseUrl}/waitForElementTestCustom`);

    await expect(
      tab.waitForElement(['document', ['querySelector', 'a#waitToShow']], {
        waitForVisible: true,
        ignoreVisibilityAttributes: ['isOnscreenVertical'],
      }),
    ).resolves.toMatchObject({
      id: expect.any(Number),
      type: 'HTMLAnchorElement',
    });
  });

  it('will yield an error for a bad querySelector', async () => {
    koaServer.get('/waitForElementBadQs', ctx => {
      ctx.body = `<body><div>Middle</div></body>`;
    });
    const { tab } = await createSession();
    await tab.goto(`${koaServer.baseUrl}/waitForElementBadQs`);

    await expect(
      tab.waitForElement(['document', ['querySelector', 'button-title="test"']], {
        waitForVisible: true,
      }),
    ).rejects.toThrowError('valid selector');
  });

  it('will wait for a valid path to exist', async () => {
    koaServer.get('/waitForElementValidPath', ctx => {
      ctx.body = `<body><ul>
<li>1</li>
<li>2</li>
</ul>
<script>
    setTimeout(function() {
      const child = document.createElement('li');
      child.innerText='3';
      document.querySelector('ul').append(child);
    }, 150);
</script>

</body>`;
    });
    const { tab } = await createSession();
    await tab.goto(`${koaServer.baseUrl}/waitForElementValidPath`);

    await expect(
      tab.waitForElement(['document', ['querySelector', 'ul'], 'children', ['item', 2]], {
        waitForVisible: true,
        timeoutMs: 5e3,
      }),
    ).resolves.toMatchObject({
      id: expect.any(Number),
      type: 'HTMLLIElement',
    });
  });

  it('will find the correct center of an element', async () => {
    koaServer.get('/waitForElementCenter', ctx => {
      ctx.body = `<body>
<div id="wrapper" style="padding: 10px;">
<div id="elem1" style="width: 50px; height: 25px; margin: 15px">I am 1</div>
<div id="elem2" style="width: 50px; height: 25px; margin: 15px">I am 2</div>
</div>
</body>`;
    });
    const { tab } = await createSession();
    await tab.goto(`${koaServer.baseUrl}/waitForElementCenter`);

    await expect(
      tab.waitForElement(['document', ['querySelector', '#wrapper']], {
        waitForVisible: true,
      }),
    ).resolves.toMatchObject({
      id: expect.any(Number),
      type: 'HTMLDivElement',
    });

    await expect(
      tab.waitForElement(['document', ['querySelector', '#elem1']], {
        waitForVisible: true,
      }),
    ).resolves.toMatchObject({
      id: expect.any(Number),
      type: 'HTMLDivElement',
    });

    await expect(
      tab.waitForElement(['document', ['querySelector', '#elem2']], {
        waitForVisible: true,
      }),
    ).resolves.toMatchObject({
      id: expect.any(Number),
      type: 'HTMLDivElement',
    });
  });

  it('will wait for an element above the fold to be on screen', async () => {
    koaServer.get('/waitForElementTestOnScreen', ctx => {
      ctx.body = `<body>
    <a id="waitToShow" href="/anywhere" style="display:block; position: absolute; top: -100px">Link</a>
<script>
    setTimeout(function() {
      document.querySelector('a#waitToShow').style.top = 0;
    }, 150);
</script>
</body>`;
    });
    const { tab } = await createSession();
    await tab.goto(`${koaServer.baseUrl}/waitForElementTestOnScreen`);

    await expect(
      tab.waitForElement(['document', ['querySelector', 'a#waitToShow']], {
        waitForVisible: true,
      }),
    ).resolves.toMatchObject({
      id: expect.any(Number),
      type: 'HTMLAnchorElement',
    });
  });

  it('will wait until an element off the bottom of the page comes into view', async () => {
    koaServer.get('/waitForElementTestOffBottom', ctx => {
      ctx.body = `<body>
<div style="height: 2000px; position: relative">
    <a id="waitToShow" href="/anywhere" style="position: relative; top: 1990px">Link</a>
 </div>
<script>
    setTimeout(function() {
      document.querySelector('a#waitToShow').scrollIntoView({ behavior: 'smooth'})
    }, 150);
</script>
</body>`;
    });
    const { tab } = await createSession();
    await tab.goto(`${koaServer.baseUrl}/waitForElementTestOffBottom`);

    await expect(
      tab.waitForElement(['document', ['querySelector', 'a#waitToShow']], {
        waitForVisible: true,
      }),
    ).resolves.toMatchObject({
      id: expect.any(Number),
      type: 'HTMLAnchorElement',
    });
  });

  it('can wait for an element to be hidden', async () => {
    koaServer.get('/waitForHidden', ctx => {
      ctx.body = `<body>
<div>
    <a id="waitToRemove">Link</a>
 </div>
<script>
    setTimeout(function() {
      document.querySelector('a#waitToRemove').remove();
    }, 150);
</script>
</body>`;
    });
    const { tab } = await createSession();
    await tab.goto(`${koaServer.baseUrl}/waitForHidden`);

    try {
      // In this case, the element might be null if removed and cleaned up depending on timing. We need to just wait
      await tab.waitForElement(['document', ['querySelector', 'a#waitToRemove']], {
        waitForHidden: true,
      });
    } catch (err) {
      expect(err).not.toBeTruthy();
    }
  });

  it('can wait for an element to be hidden with specific reasons', async () => {
    koaServer.get('/waitForDisplayNone', ctx => {
      ctx.body = `<body>
<div>
    <div id="div1">Target</div>
    <a id="clicker" onclick="click1()">Link</a>
 </div>
<script>
  let count = 0;
  function click1() {
    const target = document.querySelector('#div1');
    console.log('click target', target)
    if (count === 0) {
      target.style.opacity = 0;
    }
    if (count === 1) {
      target.style.display = 'none';
    }
    count +=1;
  }
</script>
</body>`;
    });
    const { tab } = await createSession();
    await tab.goto(`${koaServer.baseUrl}/waitForDisplayNone`);

    await expect(
      tab.waitForElement(['document', ['querySelector', '#div1']], {
        waitForHidden: true,
        ignoreVisibilityAttributes: ['hasCssVisibility', 'hasCssOpacity'],
        timeoutMs: 200,
      }),
    ).rejects.toThrowError();

    await tab.interact([
      {
        command: 'click',
        mousePosition: ['document', ['querySelector', '#clicker']],
      },
    ]);
    await expect(
      tab.waitForElement(['document', ['querySelector', '#div1']], {
        waitForHidden: true,
        ignoreVisibilityAttributes: ['hasCssVisibility', 'hasCssOpacity'],
        timeoutMs: 500,
      }),
    ).rejects.toThrowError();

    await tab.interact([
      {
        command: 'click',
        mousePosition: ['document', ['querySelector', '#clicker']],
      },
    ]);
    await expect(
      tab.waitForElement(['document', ['querySelector', '#div1']], {
        waitForHidden: true,
        ignoreVisibilityAttributes: ['hasCssVisibility', 'hasCssOpacity'],
        timeoutMs: 500,
      }),
    ).resolves.toBeTruthy();
  });
});

async function createSession(
  options?: ISessionCreateOptions,
): Promise<{ session: Session; tab: Tab }> {
  const meta = await connection.createSession(options);
  const tab = Session.getTab(meta);
  Helpers.needsClosing.push(tab.session);
  return { session: tab.session, tab };
}
