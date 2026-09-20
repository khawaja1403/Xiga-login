// XIGA PRO Login

const SUPABASE_URL = "https://ebtbxwewnanhrynnlrdm.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_5ZiMDC2HLsc_qhoFM8hVQw_CbIZS2rs";
const FUNCTION_NAME = "xiga-request-activation-key";

const sb = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

const $ = id => document.getElementById(id);

let signup = false;

function message(el, text, ok = false) {
  $(el).textContent = text || "";
  $(el).className = "msg " + (text ? (ok ? "ok" : "err") : "");
}

function authMode(isSignup) {
  signup = isSignup;

  $("title").textContent = signup
    ? "Create your account"
    : "Welcome back";

  $("desc").textContent = signup
    ? "Create your secure XIGA PRO account."
    : "Sign in to continue to XIGA PRO.";

  $("nameBox").classList.toggle("hidden", !signup);

  $("authBtn").textContent = signup
    ? "CREATE ACCOUNT"
    : "LOGIN";

  $("switchBtn").textContent = signup
    ? "Already have an account? Login"
    : "Create an account";

  message("authMsg", "");
}

async function fn(action, extra = {}) {
  const { data, error } = await sb.functions.invoke(
    FUNCTION_NAME,
    {
      body: {
        action,
        ...extra
      }
    }
  );

  if (error) {
    throw new Error(error.message || "Request failed");
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return data;
}


// SHOW LOGIN / DASHBOARD + SUBSCRIPTION STATUS
async function showSession() {
  const {
    data: { session }
  } = await sb.auth.getSession();

  if (!session) {
    $("auth").classList.remove("hidden");
    $("dash").classList.add("hidden");
    return;
  }

  $("auth").classList.add("hidden");
  $("dash").classList.remove("hidden");

  $("userEmail").textContent = session.user.email || "—";

  // Load real subscription status
  try {
    const status = await fn("status");

    if (status.active) {
      const expiry = new Date(
        status.subscription_expires_at
      );

      $("sub").textContent =
        `ACTIVE • ${expiry.toLocaleDateString()} • ${status.days_remaining} days left`;
    } else {
      $("sub").textContent =
        "Use your key to activate";
    }

  } catch (e) {
    $("sub").textContent =
      "Unable to load subscription status";
  }
}


// SWITCH LOGIN / SIGNUP
$("switchBtn").onclick = () => {
  authMode(!signup);
};


// LOGIN / SIGNUP
$("authBtn").onclick = async () => {
  const email = $("email").value.trim();
  const password = $("password").value;
  const name = $("name").value.trim();

  if (!email || !password) {
    return message(
      $("authMsg"),
      "Enter your email and password."
    );
  }

  $("authBtn").disabled = true;

  message(
    $("authMsg"),
    signup
      ? "Creating account..."
      : "Signing in...",
    true
  );

  try {

    if (signup) {

      const { data, error } =
        await sb.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: name
            }
          }
        });

      if (error) {
        throw error;
      }

      if (data.session) {
        await showSession();
      } else {
        message(
          $("authMsg"),
          "Account created. Check your email to confirm it.",
          true
        );
      }

    } else {

      const { error } =
        await sb.auth.signInWithPassword({
          email,
          password
        });

      if (error) {
        throw error;
      }

      await showSession();
    }

  } catch (e) {

    message(
      $("authMsg"),
      e.message || "Unable to continue."
    );

  } finally {

    $("authBtn").disabled = false;
  }
};


// LOGOUT
$("logout").onclick = async () => {
  await sb.auth.signOut();

  authMode(false);

  await showSession();
};


// GENERATE ACTIVATION KEY REQUEST
$("generate").onclick = async () => {

  $("generate").disabled = true;

  message(
    $("keyMsg"),
    "Generating request...",
    true
  );

  try {

    await fn("request");

    message(
      $("keyMsg"),
      "Request sent to XIGA owner.",
      true
    );

  } catch (e) {

    message(
      $("keyMsg"),
      e.message || "Unable to generate request"
    );

  } finally {

    $("generate").disabled = false;
  }
};


// ACTIVATE KEY
$("activate").onclick = async () => {

  const key =
    $("key").value.trim().toUpperCase();

  if (!key) {
    return message(
      $("keyMsg"),
      "Enter your activation key."
    );
  }

  $("activate").disabled = true;

  message(
    $("keyMsg"),
    "Activating...",
    true
  );

  try {

    const result =
      await fn("activate", { key });

    const expiry =
      new Date(result.subscription_expires_at);

    $("sub").textContent =
      `ACTIVE • ${expiry.toLocaleDateString()}`;

    message(
      $("keyMsg"),
      `XIGA PRO activated. Subscription ends ${expiry.toLocaleDateString()}`,
      true
    );

  } catch (e) {

    message(
      $("keyMsg"),
      e.message || "Activation failed."
    );

  } finally {

    $("activate").disabled = false;
  }
};


// CHECK SESSION WHEN AUTH STATE CHANGES
sb.auth.onAuthStateChange(() => {
  showSession();
});


// START
authMode(false);
showSession();
