/* FINDAT public Supabase Auth configuration.
 *
 * Only browser-safe project values belong here. Never add a service-role key,
 * secret key, database password, SMTP password, or administrator password.
 */
window.FINDAT_AUTH_CONFIG = Object.freeze({
  supabaseUrl: 'https://gmiqvpemuabjueyprwyl.supabase.co',
  publishableKey: 'sb_publishable_1bOP6RQg-Wd2k51Q3LB1Pg_LsWjdErW',
  usernameLoginFunction: 'findat-username-login',
  adminUsersFunction: 'findat-admin-users',
  x1OpenAiFunction: 'findat-x1-openai'
});
