const { planUpdate, CHANNELS } = require('../scripts/updatePlan');

const HEAD = 'a'.repeat(40);
const expoConfig = {
  updates: { url: 'https://u.expo.dev/project' },
  runtimeVersion: { policy: 'appVersion' },
};
const facts = (overrides = {}) => ({
  channel: 'preview',
  branch: 'main',
  dirty: false,
  head: HEAD,
  originMain: HEAD,
  subject: 'Fix feed spacing',
  expoConfig,
  ...overrides,
});

describe('planUpdate', () => {
  test('a clean tree on main may go to either channel', () => {
    for (const channel of CHANNELS) {
      const plan = planUpdate(facts({ channel }));
      expect(plan.errors).toEqual([]);
      expect(plan.command).toEqual([
        'eas-cli', 'update', '--channel', channel, '--environment', channel,
        '--message', 'aaaaaaa Fix feed spacing', '--non-interactive',
      ]);
    }
  });

  test('reports the runtime version being targeted', () => {
    expect(planUpdate(facts()).runtimeVersion).toBe('{"policy":"appVersion"}');
  });

  test('refuses an unknown channel', () => {
    const plan = planUpdate(facts({ channel: 'staging' }));
    expect(plan.command).toBeNull();
    expect(plan.errors[0]).toMatch(/Channel must be one of/);
  });

  test('refuses to publish with uncommitted changes, on any channel', () => {
    for (const channel of CHANNELS) {
      const plan = planUpdate(facts({ channel, dirty: true }));
      expect(plan.command).toBeNull();
      expect(plan.errors.join()).toMatch(/uncommitted/);
    }
  });

  describe('preview', () => {
    test('may be published from a feature branch that is not on origin', () => {
      const plan = planUpdate(facts({ branch: 'feat/fix-2mr', originMain: 'b'.repeat(40) }));
      expect(plan.errors).toEqual([]);
    });
  });

  describe('production', () => {
    test('must come from main', () => {
      const plan = planUpdate(facts({ channel: 'production', branch: 'feat/fix-2mr' }));
      expect(plan.command).toBeNull();
      expect(plan.errors.join()).toMatch(/published from main/);
    });

    test('must be exactly origin/main', () => {
      const plan = planUpdate(facts({ channel: 'production', originMain: 'b'.repeat(40) }));
      expect(plan.command).toBeNull();
      expect(plan.errors.join()).toMatch(/not the same as origin\/main/);
    });

    test('cannot be published when origin/main is unknown', () => {
      const plan = planUpdate(facts({ channel: 'production', originMain: null }));
      expect(plan.command).toBeNull();
      expect(plan.errors.join()).toMatch(/Could not read origin\/main/);
    });
  });

  test('refuses when the app config would not let a build receive updates', () => {
    for (const broken of [{}, { updates: expoConfig.updates }, { runtimeVersion: expoConfig.runtimeVersion }]) {
      const plan = planUpdate(facts({ expoConfig: broken }));
      expect(plan.command).toBeNull();
      expect(plan.errors.join()).toMatch(/updates\.url \/ runtimeVersion/);
    }
  });

  test('lists every problem at once', () => {
    const plan = planUpdate(facts({ channel: 'production', branch: 'x', dirty: true, originMain: null }));
    expect(plan.errors.length).toBe(3);
  });

  test('the real app.json passes the config check', () => {
    const plan = planUpdate(facts({ expoConfig: require('../app.json').expo }));
    expect(plan.errors).toEqual([]);
  });
});
