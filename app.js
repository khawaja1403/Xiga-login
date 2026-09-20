// XIGA PRO LOGIN

const SUPABASE_URL =
  "https://ebtbxwewnanhrynnlrdm.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_5ZiMDC2HLsc_qhoFM8hVQw_CbIZS2rs";

const FUNCTION_NAME =
  "xiga-request-activation-key";


// ==========================================
// SUPABASE CLIENT
// ==========================================

const sb = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      storage: window.localStorage,
      storageKey: "xiga-pro-auth"
    }
  }
);


// ==========================================
// HELPERS
// ==========================================

const $ = (id) =>
  document.getElementById(id);

let signup = false;
let currentSession = null;


function message(id, text, ok = false) {

  const el = $(id);

  if (!el) return;

  el.textContent = text || "";

  el.className =
    "msg " +
    (
      text
        ? (ok ? "ok" : "err")
        : ""
    );
}


// ==========================================
// AUTH MODE
// ==========================================

function authMode(isSignup) {

  signup = isSignup;

  $("title").textContent =
    signup
      ? "Create your account"
      : "Welcome back";

  $("desc").textContent =
    signup
      ? "Create your secure XIGA PRO account."
      : "Sign in to continue to XIGA PRO.";

  $("nameBox").classList.toggle(
    "hidden",
    !signup
  );

  $("authBtn").textContent =
    signup
      ? "CREATE ACCOUNT"
      : "LOGIN";

  $("switchBtn").textContent =
    signup
      ? "Already have an account? Login"
      : "Create an account";

  message(
    "authMsg",
    ""
  );
}


// ==========================================
// SHOW LOGIN
// ==========================================

function showLoggedOut() {

  currentSession = null;

  $("auth").classList.remove(
    "hidden"
  );

  $("dash").classList.add(
    "hidden"
  );

}


// ==========================================
// EDGE FUNCTION
// ==========================================

async function fn(
  action,
  extra = {}
) {

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
      error.message ||
      "Request failed"
    );

  }

  if (data?.error) {

    throw new Error(
      data.error
    );

  }

  return data;
}


// ==========================================
// SUBSCRIPTION STATUS
// ==========================================

async function loadSubscription() {

  $("sub").textContent =
    "Checking subscription...";

  try {

    const status =
      await fn("status");


    if (
      status &&
      status.active &&
      status.subscription_expires_at
    ) {

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

      return;

    }


    $("sub").textContent =
      "INACTIVE • Activation key required";


  } catch (error) {

    console.error(
      "Subscription status error:",
      error
    );

    $("sub").textContent =
      "Unable to load subscription status";

  }

}


// ==========================================
// SHOW DASHBOARD
// ==========================================

async function showDashboard(
  session
) {

  if (!session) {

    showLoggedOut();

    return;

  }

  currentSession = session;


  $("auth").classList.add(
    "hidden"
  );

  $("dash").classList.remove(
    "hidden"
  );


  $("userEmail").textContent =
    session.user.email || "—";


  await loadSubscription();

}


// ==========================================
// SWITCH LOGIN / SIGNUP
// ==========================================

$("switchBtn").onclick = () => {

  authMode(!signup);

};


// ==========================================
// LOGIN / SIGNUP
// ==========================================

$("authBtn").onclick =
  async () => {

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

      // ====================================
      // SIGN UP
      // ====================================

      if (signup) {

        const {
          data,
          error
        } =
          await sb.auth.signUp({

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


        if (data && data.session) {

          await showDashboard(
            data.session
          );

        } else {

          message(
            "authMsg",
            "Account created. Check your email to confirm it.",
            true
          );

        }


      // ====================================
      // LOGIN
      // ====================================

      } else {

        const {
          data,
          error
        } =
          await sb.auth.signInWithPassword({

            email: email,

            password: password

          });


        if (error) {
          throw error;
        }


        if (
          data &&
          data.session
        ) {

          /*
            Show dashboard immediately.
            We do not wait for the
            auth-state listener.
          */

          currentSession =
            data.session;


          $("auth").classList.add(
            "hidden"
          );

          $("dash").classList.remove(
            "hidden"
          );


          $("userEmail").textContent =
            data.session.user.email || "—";


          /*
            Load subscription separately.
            Login does not depend on this.
          */

          loadSubscription();

        } else {

          throw new Error(
            "Login succeeded but no session was returned."
          );

        }

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


// ==========================================
// LOGOUT
// ==========================================

$("logout").onclick =
  async () => {

    $("logout").disabled = true;


    try {

      await sb.auth.signOut();

    } catch (error) {

      console.error(
        "Logout error:",
        error
      );

    }


    $("logout").disabled = false;

    authMode(false);

    showLoggedOut();

  };


// ==========================================
// GENERATE ACTIVATION KEY
// ==========================================

$("generate").onclick =
  async () => {

    $("generate").disabled = true;


    message(
      "keyMsg",
      "Generating activation key...",
      true
    );


    try {

      /*
        Edge Function:

        1. Creates the key
        2. Links it to this account
        3. Sends it to:

           khawaja1403@gmail.com
      */

      await fn("request");


      message(
        "keyMsg",
        "Activation key generated and sent to XIGA owner.",
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
        "Unable to generate activation key."
      );


    } finally {

      $("generate").disabled = false;

    }

  };


// ==========================================
// ACTIVATE KEY
// ==========================================

$("activate").onclick =
  async () => {

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
      "Activating XIGA PRO...",
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


      if (
        !result ||
        !result.subscription_expires_at
      ) {

        throw new Error(
          "Activation completed but subscription information was not returned."
        );

      }


      const expiry =
        new Date(
          result.subscription_expires_at
        );


      $("key").value = "";


      $("sub").textContent =
        "ACTIVE • " +
        expiry.toLocaleDateString();


      message(
        "keyMsg",
        "XIGA PRO activated successfully. Subscription ends " +
        expiry.toLocaleDateString(),
        true
      );


      // Refresh actual subscription status

      await loadSubscription();


    } catch (error) {

      console.error(
        "Activation error:",
        error
      );


     
