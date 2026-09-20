// XIGA PRO LOGIN

const SUPABASE_URL =
  "https://ebtbxwewnanhrynnlrdm.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_5ZiMDC2HLsc_qhoFM8hVQw_CbIZS2rs";

const FUNCTION_NAME =
  "xiga-request-activation-key";


// ========================================
// SUPABASE CLIENT
// ========================================

const supabaseClient =
  window.supabase.createClient(
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


// ========================================
// HELPERS
// ========================================

const $ = (id) =>
  document.getElementById(id);

let signupMode = false;


// ========================================
// MESSAGE
// ========================================

function showMessage(
  id,
  text,
  success = false
) {

  const element = $(id);

  if (!element) return;

  element.textContent = text || "";

  element.className =
    "msg " +
    (
      text
        ? (success ? "ok" : "err")
        : ""
    );
}


// ========================================
// AUTH MODE
// ========================================

function setAuthMode(signup) {

  signupMode = signup;

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

  showMessage(
    "authMsg",
    ""
  );
}


// ========================================
// SHOW LOGIN
// ========================================

function showLogin() {

  $("auth").classList.remove(
    "hidden"
  );

  $("dash").classList.add(
    "hidden"
  );

}


// ========================================
// SHOW DASHBOARD
// ========================================

function showDashboard(session) {

  if (!session) {

    showLogin();

    return;

  }

  $("auth").classList.add(
    "hidden"
  );

  $("dash").classList.remove(
    "hidden"
  );

  $("userEmail").textContent =
    session.user.email || "—";

}


// ========================================
// EDGE FUNCTION
// ========================================

async function callFunction(
  action,
  extra = {}
) {

  const {
    data,
    error
  } =
    await supabaseClient.functions.invoke(
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


// ========================================
// SUBSCRIPTION STATUS
// ========================================

async function checkSubscription() {

  $("sub").textContent =
    "Checking subscription...";


  try {

    const result =
      await callFunction(
        "status"
      );


    console.log(
      "XIGA STATUS:",
      result
    );


    if (
      result &&
      result.active === true &&
      result.subscription_expires_at
    ) {

      const expiry =
        new Date(
          result.subscription_expires_at
        );


      $("sub").textContent =
        "ACTIVE • " +
        expiry.toLocaleDateString() +
        " • " +
        result.days_remaining +
        " days left";


      return;

    }


    $("sub").textContent =
      "INACTIVE • Activation key required";


  } catch (error) {

    console.error(
      "XIGA STATUS ERROR:",
      error
    );


    $("sub").textContent =
      "Unable to load subscription status";

  }

}


// ========================================
// SWITCH LOGIN / SIGNUP
// ========================================

$("switchBtn").onclick =
  function () {

    setAuthMode(
      !signupMode
    );

  };


// ========================================
// LOGIN / SIGNUP
// ========================================

$("authBtn").onclick =
  async function () {

    const email =
      $("email").value.trim();

    const password =
      $("password").value;

    const name =
      $("name").value.trim();


    if (!email || !password) {

      showMessage(
        "authMsg",
        "Enter your email and password."
      );

      return;

    }


    $("authBtn").disabled =
      true;


    showMessage(
      "authMsg",
      signupMode
        ? "Creating account..."
        : "Signing in...",
      true
    );


    try {

      // ==================================
      // SIGN UP
      // ==================================

      if (signupMode) {

        const {
          data,
          error
        } =
          await supabaseClient.auth.signUp({

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


        if (
          data &&
          data.session
        ) {

          showDashboard(
            data.session
          );

          setTimeout(
            checkSubscription,
            300
          );

        } else {

          showMessage(
            "authMsg",
            "Account created. Check your email to confirm it.",
            true
          );

        }


        return;

      }


      // ==================================
      // LOGIN
      // ==================================

      const {
        data,
        error
      } =
        await supabaseClient.auth
          .signInWithPassword({

            email: email,

            password: password

          });


      if (error) {
        throw error;
      }


      if (
        !data ||
        !data.session
      ) {

        throw new Error(
          "Login succeeded but no session was returned."
        );

      }


      showDashboard(
        data.session
      );


      showMessage(
        "authMsg",
        ""
      );


      // Wait until auth/session storage
      // has finished updating.

      setTimeout(
        checkSubscription,
        300
      );


    } catch (error) {

      console.error(
        "LOGIN ERROR:",
        error
      );


      showMessage(
        "authMsg",
        error.message ||
        "Unable to login."
      );


    } finally {

      $("authBtn").disabled =
        false;

    }

  };


// ========================================
// LOGOUT
// ========================================

$("logout").onclick =
  async function () {

    $("logout").disabled =
      true;


    try {

      await supabaseClient.auth.signOut();

    } catch (error) {

      console.error(
        "LOGOUT ERROR:",
        error
      );

    }


    $("logout").disabled =
      false;

    setAuthMode(false);

    showLogin();

  };


// ========================================
// GENERATE ACTIVATION KEY
// ========================================

$("generate").onclick =
  async function () {

    $("generate").disabled =
      true;


    showMessage(
      "keyMsg",
      "Generating activation key...",
      true
    );


    try {

      await callFunction(
        "request"
      );


      showMessage(
        "keyMsg",
        "Activation key generated and sent to XIGA owner.",
        true
      );


    } catch (error) {

      console.error(
        "GENERATE KEY ERROR:",
        error
      );


      showMessage(
        "keyMsg",
        error.message ||
        "Unable to generate activation key."
      );


    } finally {

      $("generate").disabled =
        false;

    }

  };


// ========================================
// ACTIVATE KEY
// ========================================

$("activate").onclick =
  async function () {

    const key =
      $("key").value
        .trim()
        .toUpperCase();


    if (!key) {

      showMessage(
        "keyMsg",
        "Enter your activation key."
      );

      return;

    }


    $("activate").disabled =
      true;


    showMessage(
      "keyMsg",
      "Activating XIGA PRO...",
      true
    );


    try {

      const result =
        await callFunction(
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
          "Activation information was not returned."
        );

      }


      $("key").value = "";


      const expiry =
        new Date(
          result.subscription_expires_at
        );


      showMessage(
        "keyMsg",
        "XIGA PRO activated successfully. Subscription ends " +
        expiry.toLocaleDateString(),
        true
      );


      checkSubscription();


    } catch (error) {

      console.error(
        "ACTIVATION ERROR:",
        error
      );


      showMessage(
        "keyMsg",
        error.message ||
        "Activation failed."
      );


    } finally {

      $("activate").disabled =
        false;

    }

  };


// ========================================
// AUTH STATE CHANGE
// ========================================
//
// This listener is ONLY for restoring
// the existing session.
//
// It does NOT call the Edge Function
// directly inside the callback.
//

supabaseClient.auth.onAuthStateChange(
  function (event, session) {

    console.log(
      "AUTH EVENT:",
      event
    );


    if (
      event === "INITIAL_SESSION"
    ) {

      if (session) {

        showDashboard(
          session
        );


        // Wait for Supabase auth
        // initialization to finish.

        setTimeout(
          checkSubscription,
          500
        );

      } else {

        showLogin();

      }

      return;

    }


    if (
      event === "SIGNED_OUT"
    ) {

      showLogin();

      return;

    }


    if (
      event === "SIGNED_IN" &&
      session
    ) {

      showDashboard(
        session
      );

      setTimeout(
        checkSubscription,
        300
      );

    }

  }
);


// ========================================
// START
// ========================================

setAuthMode(false);
