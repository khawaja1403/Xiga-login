// XIGA PRO Login

const SUPABASE_URL = "https://ebtbxwewnanhrynnlrdm.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_5ZiMDC2HLsc_qhoFM8hVQw_CbIZS2rs";
const FUNCTION_NAME = "xiga-request-activation-key";

const sb = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

const $ = (id) => document.getElementById(id);

let signup = false;


// ------------------------------
// MESSAGE
// ------------------------------

function message(id, text, ok = false) {
  const el = $(id);

  if (!el) return;

  el.textContent = text || "";
  el.className =
    "msg " + (text ? (ok ? "ok" : "err") : "");
}


// ------------------------------
// LOGIN / SIGNUP MODE
// ------------------------------

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


// ------------------------------
// EDGE FUNCTION
// ------------------------------

async function fn(action, extra = {}) {
  const { data, error } =
    await sb.functions.invoke(
      FUNCTION_NAME,
      {
        body: {
          action,
          ...extra
        }
      }
    );

  if (error) {
    throw new Error(
      error.message || "Request failed"
    );
  }

  if (data && data.error) {
    throw new Error(data.error);
  }

  return data;
}


// ------------------------------
// DISPLAY LOGGED-IN USER
// ------------------------------

async function showDashboard(session) {

  if (!session) {
    $("auth").classList.remove("hidden");
    $("dash").classList.add("hidden");
    return;
  }

  $("auth").classList.add("hidden");
  $("dash").classList.remove("hidden");

  $("userEmail").textContent =
    session.user.email || "—";


  // ------------------------------
  // SUBSCRIPTION STATUS
  // ------------------------------

  try {

    const status = await fn("status");

    if (status.active) {

      const expiry =
        new Date(
          status.subscription_expires_at
        );

      $("sub").textContent =
        "ACTIVE • " +
        expiry.toLocaleDateString() +
        " • " +
        status.days_remaining +
        " days left";

    } else {

      $("sub").textContent =
        "Use your key to activate";
    }

  } catch (error) {

    console.error(
      "Subscription status error:",
      error
    );

    $("sub").textContent =
      "Use your key to activate";
  }
}


// ------------------------------
// LOAD CURRENT SESSION
// ------------------------------

async function loadSession() {

  try {

    const {
      data: { session },
      error
    } = await sb.auth.getSession();

    if (error) {
      throw error;
    }

    await showDashboard(session);

  } catch (error) {

    console.error(
      "Session error:",
      error
    );

    $("auth").classList.remove("hidden");
    $("dash").classList.add("hidden");
  }
}


// ------------------------------
// SWITCH LOGIN / SIGNUP
// ------------------------------

$("switchBtn").onclick = () => {
  authMode(!signup);
};


// ------------------------------
// LOGIN / SIGNUP
// ------------------------------

$("authBtn").onclick = async () => {

  const email =
    $("email").value.trim();

  const password =
    $("password").value;

  const name =
    $("name").value.trim();


  if (!email || !password) {

    message(
      "authMsg",
      "Enter your email and password."
    );

    return;
  }


  $("authBtn").disabled = true;

  message(
    "authMsg",
    signup
      ? "Creating account..."
      : "Signing in...",
    true
  );


  try {

    // CREATE ACCOUNT
    if (signup) {

      const {
        data,
        error
      } = await sb.auth.signUp({
        email: email,
        password: password,
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

        await showDashboard(data.session);

      } else {

        message(
          "authMsg",
          "Account created. Check your email to confirm it.",
          true
        );
      }


    }

    // LOGIN
    else {

      const {
        data,
        error
      } = await sb.auth.signInWithPassword({
        email: email,
        password: password
      });


      if (error) {
        throw error;
      }


      if (!data.session) {
        throw new Error(
          "Login successful, but no session was created."
        );
      }


      // Directly show dashboard.
      // No auth-state callback is used here.
      await showDashboard(data.session);
    }


  } catch (error) {

    console.error(
      "Authentication error:",
      error
    );

    message(
      "authMsg",
      error.message ||
      "Unable to continue."
    );

  } finally {

    $("authBtn").disabled = false;
  }
};


// ------------------------------
// LOGOUT
// ------------------------------

$("logout").onclick = async () => {

  try {

    await sb.auth.signOut();

  } catch (error) {

    console.error(
      "Logout error:",
      error
    );
  }

  authMode(false);

  $("auth").classList.remove("hidden");
  $("dash").classList.add("hidden");
};


// ------------------------------
// GENERATE ACTIVATION KEY
// ------------------------------

$("generate").onclick = async () => {

  $("generate").disabled = true;

  message(
    "keyMsg",
    "Generating request...",
    true
  );


  try {

    await fn("request");

    message(
      "keyMsg",
      "Request sent to XIGA owner.",
      true
    );

  } catch (error) {

    console.error(
      "Generate key error:",
      error
    );

    message(
      "keyMsg",
      error.message ||
      "Unable to generate request"
    );

  } finally {

    $("generate").disabled = false;
  }
};


// ------------------------------
// ACTIVATE KEY
// ------------------------------

$("activate").onclick = async () => {

  const key =
    $("key").value
      .trim()
      .toUpperCase();


  if (!key) {

    message(
      "keyMsg",
      "Enter your activation key."
    );

    return;
  }


  $("activate").disabled = true;

  message(
    "keyMsg",
    "Activating...",
    true
  );


  try {

    const result =
      await fn(
        "activate",
        {
          key: key
        }
      );


    const expiry =
      new Date(
        result.subscription_expires_at
      );


    $("sub").textContent =
      "ACTIVE • " +
      expiry.toLocaleDateString() +
      " • 365 days";


    message(
      "keyMsg",
      "XIGA PRO activated. Subscription ends " +
      expiry.toLocaleDateString(),
      true
    );


  } catch (error) {

    console.error(
      "Activation error:",
      error
    );

    message(
      "keyMsg",
      error.message ||
      "Activation failed."
    );

  } finally {

    $("activate").disabled = false;
  }
};


// ------------------------------
// START
// ------------------------------

authMode(false);
loadSession();
