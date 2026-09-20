// XIGA PRO Login frontend
// Replace these two placeholders with your Supabase project values.
const SUPABASE_URL = "YOUR_SUPABASE_URL";
const SUPABASE_PUBLISHABLE_KEY = "YOUR_SUPABASE_PUBLISHABLE_KEY";
const FUNCTION_NAME = "xiga-request-activation-key";

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const $ = id => document.getElementById(id);
let signup = false;

function message(el,text,ok=false){el.textContent=text||"";el.className="msg"+(text?(ok?" ok":" err"):"");}
function authMode(isSignup){
  signup=isSignup;
  $("title").textContent=signup?"Create your account":"Welcome back";
  $("desc").textContent=signup?"Create your secure XIGA PRO account.":"Sign in to continue to XIGA PRO.";
  $("nameBox").classList.toggle("hidden",!signup);
  $("authBtn").textContent=signup?"CREATE ACCOUNT":"LOGIN";
  $("switchBtn").textContent=signup?"Already have an account? Login":"Create an account";
  message($("authMsg"),"");
}
async function fn(action,extra={}){
  const {data,error}=await sb.functions.invoke(FUNCTION_NAME,{body:{action,...extra}});
  if(error)throw new Error(error.message||"Request failed");
  if(data?.error)throw new Error(data.error);
  return data;
}
async function showSession(){
  const {data:{session}}=await sb.auth.getSession();
  if(!session){$("auth").classList.remove("hidden");$("dash").classList.add("hidden");return}
  $("auth").classList.add("hidden");$("dash").classList.remove("hidden");
  $("userEmail").textContent=session.user.email||"—";
}
$("switchBtn").onclick=()=>authMode(!signup);
$("authBtn").onclick=async()=>{
  const email=$("email").value.trim(),password=$("password").value,name=$("name").value.trim();
  if(!email||!password)return message($("authMsg"),"Enter your email and password.");
  $("authBtn").disabled=true;message($("authMsg"),signup?"Creating account...":"Signing in...",true);
  try{
    if(signup){
      const {data,error}=await sb.auth.signUp({email,password,options:{data:{full_name:name}}});
      if(error)throw error;
      if(data.session)await showSession();else message($("authMsg"),"Account created. Check your email to confirm it.",true);
    }else{
      const {error}=await sb.auth.signInWithPassword({email,password});
      if(error)throw error;await showSession();
    }
  }catch(e){message($("authMsg"),e.message||"Unable to continue.")}finally{$("authBtn").disabled=false}
};
$("logout").onclick=async()=>{await sb.auth.signOut();authMode(false);await showSession()};
$("generate").onclick=async()=>{
  $("generate").disabled=true;message($("keyMsg"),"Generating request...",true);
  try{const r=await fn("request");message($("keyMsg"),r.message||"Request sent to XIGA owner.",true)}
  catch(e){message($("keyMsg"),e.message||"Unable to generate request.")}finally{$("generate").disabled=false}
};
$("activate").onclick=async()=>{
  const key=$("key").value.trim().toUpperCase();
  if(!key)return message($("keyMsg"),"Enter your activation key.");
  $("activate").disabled=true;message($("keyMsg"),"Activating...",true);
  try{
    const r=await fn("activate",{key});
    const exp=r.subscription_expires_at?new Date(r.subscription_expires_at).toLocaleDateString():"—";
    $("pill").textContent="ACTIVE";$("expiry").textContent=`Active until ${exp}`;
    message($("keyMsg"),`XIGA PRO activated. Subscription ends ${exp}.`,true);
  }catch(e){message($("keyMsg"),e.message||"Activation failed.")}finally{$("activate").disabled=false}
};
sb.auth.onAuthStateChange(()=>showSession());
authMode(false);showSession();
