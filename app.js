// XIGA PRO LOGIN

const SUPABASE_URL = "https://ebtbxwewnanhrynnlrdm.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_5ZiMDC2HLsc_qhoFM8hVQw_CbIZS2rs";

const FUNCTION_NAME = "xiga-request-activation-key";

const sb = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      storage: window.localStorage
    }
  }
);

const $ = (id) => document.getElementById(id);

let signup = false;


// -----------------------------
// MESSAGE
// -----------------------------

function message(id, text, ok = false) {
  const el = $(id);

  if (!el) return;

  el.textContent = text || "";
  el.className = "msg " + (text ? (ok ? "ok" : "err") : "");
}


// -----------------------------
// AUTH MODE
// -----------------------------

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


// -----------------------------
// EDGE FUNCTION
// -----------------------------

async function fn(action, extra = {}) {

  const {
    data,
    error
  } = await sb.functions.invoke(
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

  if (data?.error) {
    throw new Error(data.error);
  }

  return data;
}


// -----------------------------
// SHOW LOGGED OUT
// -----------------------------

function showLoggedOut() {

  $("auth").classList.remove("hidden");
  $("dash").classList.add("hidden");

  $("sub").textContent =
    "Use your key to activate";
}


// -----------------------------
// LOAD DASHBOARD
// -----------------------------

async function renderSession(session) {

  if (!session) {
    showLoggedOut();
    return;
  }

  $("auth").classList.add("hidden");
  $("dash").classList.remove("hidden");

  $("userEmail").textContent =
    session.user.email || "—";

  // Reset status while loading
  $("sub").textContent =
    "Checking subscription...";

  try {

    const status = await fn("status");

    if (status.active) {

      const expiry =
        new Date(
          status.subscription_expires_at
        );

      $("sub").textContent =
        `ACTIVE • ${expiry.toLocaleDateString()} • ${status.days_remaining} days left`;

    } else {

      $("sub").textContent =
        "INACTIVE • Activation key required";
    }

  } catch (e) {

    console.error(
      "Subscription status error:",
      e
    );

    $("sub").textContent =
      "Unable to load subscription status";
  }
}


// -----------------------------
// SWITCH LOGIN / SIGNUP
// -----------------------------

$("switchBtn").onclick = () => {

  authMode(!signup);

};


// -----------------------------
// LOGIN / SIGNUP
// -----------------------------

$("authBtn").onclick = async () => {

  const email =
    $("email").value.trim();

  const password =
    $("password").value;

  const name =
    $("name").value.trim();


  if (!email || !password) {

    return message(
      "authMsg",
      "Enter your email and password."
    );

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

    // -------------------------
    // SIGN UP
    // -------------------------

    if (signup) {

      const {
        data,
        error
      } = await sb.auth.signUp({

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


      // Email confirmation disabled
      // and session created

      if (data.session) {

        await renderSession(
          data.session
        );

      } else {

        message(
          "authMsg",
          "Account created. Check your email to confirm it.",
          true
        );

      }


    // -------------------------
    // LOGIN
    // -------------------------

    } else {

      const {
        data,
        error
      } = await sb.auth.signInWithPassword({

        email,

        password

      });


      if (error) {
        throw error;
      }


      if (data.session) {

        await renderSession(
          data.session
        );

      }

    }


  } catch (e) {

    console.error(e);

    message(
      "authMsg",
      e.message ||
      "Unable to continue."
    );

  } finally {

    $("authBtn").disabled = false;

  }

};


// -----------------------------
// LOGOUT
// -----------------------------

$("logout").onclick = async () => {

  await sb.auth.signOut();

  authMode(false);

  showLoggedOut();

};


// -----------------------------
// GENERATE ACTIVATION KEY
// -----------------------------

$("generate").onclick = async () => {

  $("generate").disabled = true;

  message(
    "keyMsg",
    "Generating activation key...",
    true
  );


  try {

    /*
      The Edge Function creates the key
      and sends it to:

      khawaja1403@gmail.com

      The actual key is NOT exposed
      to the user on this website.
    */

    await fn("request");


    message(
      "keyMsg",
      "Activation key generated and sent to XIGA owner.",
      true
    );


  } catch (e) {

    console.error(e);

    message(
      "keyMsg",
      e.message ||
      "Unable to generate activation key."
    );


  } finally {

    $("generate").disabled = false;

  }

};


// -----------------------------
// ACTIVATE KEY
// -----------------------------

$("activate").onclick = async () => {

  const key =
    $("key").value
      .trim()
      .toUpperCase();


  if (!key) {

    return message(
      "keyMsg",
      "Enter your activation key."
    );

  }


  $("activate").disabled = true;


  message(
    "keyMsg",
    "Activating XIGA PRO...",
    true
  );


  try {

    const result =
      await fn(
        "activate",
        {
          key
        }
      );


    const expiry =
      new Date(
        result.subscription_expires_at
      );


    $("sub").textContent =
      `ACTIVE • ${expiry.toLocaleDateString()} • 365 days`;


    $("key").value = "";


    message(
      "keyMsg",
      `XIGA PRO activated. Subscription ends ${expiry.toLocaleDateString()}`,
      true
    );


    // Refresh real status
    const status =
      await fn("status");


    if (status.active) {

      $("sub").textContent =
        `ACTIVE • ${new Date(
          status.subscription_expires_at
        ).toLocaleDateString()} • ${status.days_remaining} days left`;

    }


  } catch (e) {

    console.error(e);

    message(
      "keyMsg",
      e.message ||
      "Activation failed."
    );


  } finally {

    $("activate").disabled = false;

  }

};


// -----------------------------
// AUTH STATE CHANGES
// -----------------------------

sb.auth.onAuthStateChange(
  (event, session) => {

    if (event === "SIGNED_OUT") {

      showLoggedOut();

    } else if (session) {

      /*
        Do not call getSession() here.
        Use the session supplied by
        Supabase directly.
      */

      renderSession(session);

    }

  }
);


// -----------------------------
// START APP
// -----------------------------

async function startApp() {

  authMode(false);


  try {

    const {
      data: {
        session
      }
    } = await sb.auth.getSession();


    if (session) {

      await renderSession(
        session
      );

    } else {

      showLoggedOut();

    }

  } catch (e) {

    console.error(
      "Startup error:",
      e
    );

    showLoggedOut();

  }

}


startApp();
