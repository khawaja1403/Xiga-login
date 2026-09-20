// XIGA PRO LOGIN

const SUPABASE_URL =
  "https://ebtbxwewnanhrynnlrdm.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_5ZiMDC2HLsc_qhoFM8hVQw_CbIZS2rs";

const FUNCTION_NAME =
  "xiga-request-activation-key";


const supabaseClient =
  window.supabase.createClient(
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


const $ = (id) =>
  document.getElementById(id);


let signupMode = false;


// ========================================
// MESSAGE
// ========================================

function showMessage(
  elementId,
  text,
  success = false
) {

  const element =
    $(elementId);

  if (!element) return;

  element.textContent =
    text || "";

  element.className =
    "msg " +
    (
      text
        ? (success ? "ok" : "err")
        : ""
    );
}


// ========================================
// AUTH SCREEN
// ========================================

function setAuthMode(
  signup
) {

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

function showDashboard(
  session
) {

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
// SUBSCRIPTION
// ========================================

async function checkSubscription() {

  $("sub").textContent =
    "Checking subscription...";


  try {

    const result =
      await callFunction(
        "status"
      );


    if (
      result &&
      result.active &&
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

    } else {

      $("sub").textContent =
        "INACTIVE • Activation key required";

    }


  } catch (error) {

    console.error(
      "Subscription:",
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


      // ==============================
      // SIGN UP
      // ==============================

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

          await checkSubscription();

        } else {

          showMessage(
            "authMsg",
            "Account created. Check your email to confirm it.",
            true
          );

        }


        return;

      }


      // ==============================
      // LOGIN
      // ==============================

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


      // IMPORTANT:
      // Show dashboard immediately.
      // Subscription check happens AFTER login.

      showDashboard(
        data.session
      );


      showMessage(
        "authMsg",
        ""
      );


      // Do not allow subscription
      // checking to block login.

      checkSubscription();


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
        "Logout:",
        error
      );

    }


    $("logout").disabled =
      false;

    setAuthMode(false);

    showLogin();

  };


// ========================================
// GENERATE KEY
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
        "GENERATE KEY:",
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


      $("key").value =
        "";


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


      await checkSubscription();


    } catch (error) {

      console.error(
        "ACTIVATE:",
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
// START
// ========================================

async function start() {

  setAuthMode(false);


  try {

    const {
      data,
      error
    } =
      await supabaseClient.auth.getSession();


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

      await checkSubscription();

    } else {

      showLogin();

    }


  } catch (error) {

    console.error(
      "START:",
      error
    );

    showLogin();

  }

}


start();
