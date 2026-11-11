const fs = require('fs');
const path = require('path');
const { initializeTestEnvironment, assertFails, assertSucceeds } = require('@firebase/rules-unit-testing');
const { ref, uploadBytes, getBytes, deleteObject } = require('firebase/storage');

let env;
const bytes = (n) => new Uint8Array(n);
const as = (uid) => env.authenticatedContext(uid).storage();

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-frameon',
    storage: { rules: fs.readFileSync(path.join(__dirname, '../../storage.rules'), 'utf8') },
  });
});

afterAll(() => env.cleanup());
beforeEach(() => env.clearStorage());

describe('post photos', () => {
  it('can be uploaded by the owner as an image', async () => {
    await assertSucceeds(uploadBytes(ref(as('alice'), 'posts/alice/p1.jpg'), bytes(100), { contentType: 'image/jpeg' }));
  });

  it('cannot be uploaded into someone else\'s folder', async () => {
    await assertFails(uploadBytes(ref(as('bob'), 'posts/alice/p1.jpg'), bytes(100), { contentType: 'image/jpeg' }));
  });

  it('must be an image under 5 MB', async () => {
    await assertFails(uploadBytes(ref(as('alice'), 'posts/alice/p1.jpg'), bytes(100), { contentType: 'text/html' }));
    await assertFails(uploadBytes(ref(as('alice'), 'posts/alice/p1.jpg'), bytes(5 * 1024 * 1024 + 1), { contentType: 'image/jpeg' }));
  });

  it('are readable when signed in only, and deletable by the owner only', async () => {
    await env.withSecurityRulesDisabled((ctx) =>
      uploadBytes(ref(ctx.storage(), 'posts/alice/p1.jpg'), bytes(10), { contentType: 'image/jpeg' }),
    );
    await assertSucceeds(getBytes(ref(as('bob'), 'posts/alice/p1.jpg')));
    await assertFails(getBytes(ref(env.unauthenticatedContext().storage(), 'posts/alice/p1.jpg')));
    await assertFails(deleteObject(ref(as('bob'), 'posts/alice/p1.jpg')));
    await assertSucceeds(deleteObject(ref(as('alice'), 'posts/alice/p1.jpg')));
  });
});

describe('avatars and everything else', () => {
  it('limits avatars to 2 MB images in your own folder', async () => {
    await assertSucceeds(uploadBytes(ref(as('alice'), 'avatars/alice/a.jpg'), bytes(100), { contentType: 'image/png' }));
    await assertFails(uploadBytes(ref(as('alice'), 'avatars/alice/a.jpg'), bytes(2 * 1024 * 1024 + 1), { contentType: 'image/png' }));
    await assertFails(uploadBytes(ref(as('bob'), 'avatars/alice/a.jpg'), bytes(100), { contentType: 'image/png' }));
  });

  it('denies any other path', async () => {
    await assertFails(uploadBytes(ref(as('alice'), 'misc/file.jpg'), bytes(10), { contentType: 'image/jpeg' }));
  });
});
