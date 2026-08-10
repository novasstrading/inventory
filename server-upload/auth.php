<?php
/**
 * Nova SS Asset Manager — authentication + users
 */

function sessions_file() { return DATA_DIR . '/sessions.json'; }
function otp_file()      { return DATA_DIR . '/otp.json'; }
function users_file()    { return DATA_DIR . '/users.json'; }

function bootstrap_users() {
    $u = @include __DIR__ . '/users.php';
    $out = [];
    if (is_array($u)) foreach ($u as $k => $v) {
        $email = is_int($k) ? $v : $k;
        $out[strtolower(trim($email))] = 'admin';
    }
    return $out;
}
function managed_users() {
    $j = load_json(users_file(), []);
    $out = [];
    foreach ($j as $email => $role) {
        $role = ($role === 'admin') ? 'admin' : 'viewer';
        $out[strtolower(trim($email))] = $role;
    }
    return $out;
}
function load_users()         { return array_merge(managed_users(), bootstrap_users()); }
function is_allowed_email($e) { return array_key_exists(strtolower(trim($e)), load_users()); }
function role_of($e)          { $u = load_users(); return $u[strtolower(trim($e))] ?? null; }
function is_bootstrap($e)     { return array_key_exists(strtolower(trim($e)), bootstrap_users()); }
function valid_email($e)      { return (bool) filter_var(trim($e), FILTER_VALIDATE_EMAIL); }

/* ---- HTML email layout ---------------------------------------------------- */
function email_wrap($innerHtml) {
    $logo = 'https://novass-inventory.vercel.app/logo-full.png';
    return '<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{margin:0;padding:0;background:#EDEFF3;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
.wrap{max-width:480px;margin:32px auto;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.10)}
.hdr{background:#001E46;padding:26px 28px;text-align:center}
.hdr img{height:52px;width:auto;margin-bottom:10px;display:block;margin-left:auto;margin-right:auto;background:#fff;border-radius:8px;padding:5px}
.hdr-name{font-size:15px;font-weight:700;color:#fff;letter-spacing:.06em}
.hdr-sub{font-size:10px;color:#BE9646;letter-spacing:.1em;font-weight:600;margin-top:3px;text-transform:uppercase}
.hdr-bar{width:44px;height:3px;background:#BE9646;border-radius:2px;margin:10px auto 0}
.body{padding:30px 28px 22px}h2{margin:0 0 6px;font-size:21px;color:#0F1722}
.sub{color:#5B6675;font-size:14px;margin:0 0 22px;line-height:1.5}
.code-wrap{background:#F0F4FA;border:2px solid #001E46;border-radius:14px;padding:24px 16px;text-align:center;margin:22px 0}
.code{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:42px;font-weight:800;letter-spacing:.22em;color:#001E46;word-spacing:.12em}
.copy-btn{display:inline-block;margin-top:16px;background:#001E46;color:#fff!important;text-decoration:none;font-size:14px;font-weight:600;padding:11px 26px;border-radius:9px;letter-spacing:.02em}
.exp{font-size:12px;color:#5B6675;margin-top:14px}
.note{font-size:13px;color:#5B6675;line-height:1.65;border-top:1px solid #EEF1F5;padding-top:16px;margin-top:18px}
.chip{display:inline-block;padding:2px 10px;border-radius:20px;font-size:12px;font-weight:600}
.chip-admin{background:#E5EEF7;color:#1F5C97}.chip-viewer{background:#EDE8F7;color:#5A3E9B}
.footer{background:#F7F9FC;padding:18px 28px;font-size:11px;color:#9AA5B4;text-align:center;border-top:1px solid #EEF1F5;line-height:1.7}
.footer b{color:#64748B}
a{color:#001E46}</style></head><body>
<div class="wrap">
<div class="hdr"><img src="'.$logo.'" alt="Nova SS Trading"><div class="hdr-name">NOVA SS TRADING</div><div class="hdr-sub">Garments Buying House</div><div class="hdr-bar"></div></div>
<div class="body">'.$innerHtml.'</div>
<div class="footer"><b>Nova SS Trading</b> — Asset Management System<br>
This is an automated message from an unmonitored address — please do not reply<br>
<a href="https://novasstrading.com" style="color:#9AA5B4">novasstrading.com</a></div>
</div></body></html>';
}

function send_email($to, $subject, $html, $text) {
    if (MAIL_METHOD === 'brevo' && BREVO_API_KEY !== '') {
        $payload = ['sender'=>['email'=>MAIL_FROM,'name'=>MAIL_FROM_NAME],
                    'to'=>[['email'=>$to]],'subject'=>$subject,
                    'htmlContent'=>$html,'textContent'=>$text];
        $ch = curl_init('https://api.brevo.com/v3/smtp/email');
        curl_setopt_array($ch,[CURLOPT_RETURNTRANSFER=>true,CURLOPT_POST=>true,
            CURLOPT_HTTPHEADER=>['accept: application/json','content-type: application/json','api-key: '.BREVO_API_KEY],
            CURLOPT_POSTFIELDS=>json_encode($payload),CURLOPT_TIMEOUT=>15]);
        $res=curl_exec($ch);$code=curl_getinfo($ch,CURLINFO_HTTP_CODE);curl_close($ch);
        return $code>=200&&$code<300;
    }
    $headers="From: ".MAIL_FROM_NAME." <".MAIL_FROM.">\r\nContent-Type: text/html; charset=UTF-8";
    return @mail($to,$subject,$html,$headers);
}

function send_code_email($email, $code) {
    $parts = implode(' ', str_split($code, 3));
    $copyLink = 'https://assets.novasstrading.com/api.php?action=copy_helper&c='.$code;
    $html = email_wrap('<h2>Your sign-in code</h2>
<p class="sub">Enter this code to sign in to Nova SS Asset Manager. It expires in '.OTP_TTL_MIN.' minutes.</p>
<div class="code-wrap"><div class="code" style="user-select:all">'.$code.'</div>
<div style="font-size:11.5px;color:#8B95A3;margin-top:4px">Tip: press and hold the code to select &amp; copy it directly</div>
<a href="'.$copyLink.'" class="copy-btn" target="_blank">Open &amp; copy code →</a>
<div class="exp">Expires in '.OTP_TTL_MIN.' minutes &nbsp;&middot;&nbsp; Do not share this code</div></div>
<p class="note">If you did not request this, someone may have entered your email by mistake. Your account remains secure — no action is needed.</p>');
    $text = "Your Nova SS Asset Manager login code is: $code\nValid for ".OTP_TTL_MIN." minutes.";
    send_email($email, 'Your login code: '.$parts, $html, $text);
}

function send_user_added_email($email, $role, $byEmail) {
    $rl = ucfirst($role);
    $chip = '<span class="chip chip-'.$role.'">'.$rl.'</span>';
    $desc = $role==='admin'
        ? 'Full access — you can add/edit assets, manage users, upload documents and print stickers.'
        : 'Read-only — you can browse inventory, search, view photos, export CSV and print stickers.';
    $html = email_wrap('<h2>You have been added</h2>
<p class="sub">'.htmlspecialchars($byEmail).' has granted you access as '.$chip.'</p>
<p style="font-size:14px;color:#0F1722;line-height:1.7"><strong>Access level:</strong> '.$desc.'</p>
<p style="font-size:14px;color:#0F1722;margin-top:14px">Sign in at <a href="https://novass-inventory.vercel.app">novass-inventory.vercel.app</a> using this email address.</p>
<p class="note">If you were not expecting this, contact your IT administrator at it-support@novasstrading.com.</p>');
    $text = "You have been added to Nova SS Asset Manager as $rl by $byEmail.\nSign in at https://novass-inventory.vercel.app";
    send_email($email, 'You have been added to Nova SS Asset Manager', $html, $text);
}

function send_user_removed_email($email, $byEmail) {
    $html = email_wrap('<h2>Access removed</h2>
<p class="sub">'.htmlspecialchars($byEmail).' has removed your access to Nova SS Asset Manager.</p>
<p style="font-size:14px;color:#5B6675;line-height:1.7">Your active sessions have been ended and you can no longer sign in. If you believe this is a mistake, contact it-support@novasstrading.com.</p>');
    $text = "Your Nova SS Asset Manager access has been removed by $byEmail.";
    send_email($email, 'Your Nova SS Asset Manager access has been removed', $html, $text);
}

/* ---- User management ----------------------------------------------------- */
function do_list_users() {
    $boot = bootstrap_users(); $rows = [];
    foreach (load_users() as $email => $role)
        $rows[] = ['email'=>$email,'role'=>$role,'protected'=>isset($boot[$email])];
    usort($rows, fn($a,$b)=>strcmp($a['email'],$b['email']));
    ok(['users'=>$rows]);
}
function do_add_user($email, $role, $byEmail) {
    $email = strtolower(trim($email));
    $role  = ($role==='admin') ? 'admin' : 'viewer';
    if (!valid_email($email)) fail('Enter a valid email address.');
    if (is_bootstrap($email)) fail('That email is a server-defined admin; edit users.php to change it.');
    $j = load_json(users_file(), []);
    $j[$email] = $role;
    save_json(users_file(), $j);
    send_user_added_email($email, $role, $byEmail);
    ok(['email'=>$email,'role'=>$role]);
}
function do_remove_user($email, $byEmail) {
    $email = strtolower(trim($email));
    if (is_bootstrap($email)) fail('Server-defined admins cannot be removed here.');
    $j = load_json(users_file(), []);
    if (!isset($j[$email])) fail('User not found.',404);
    unset($j[$email]); save_json(users_file(), $j);
    $s = load_json(sessions_file(), []);
    foreach ($s as $t=>$row) if (strtolower($row['email']??'')===$email) unset($s[$t]);
    save_json(sessions_file(), $s);
    send_user_removed_email($email, $byEmail);
    ok(['removed'=>$email]);
}

/* ---- OTP + sessions ------------------------------------------------------ */
function do_request_code($email) {
    $email = strtolower(trim($email));
    if (!valid_email($email)) fail('Enter a valid email address.');
    if (is_allowed_email($email)) {
        $otp = load_json(otp_file(), []); $now = time(); $rec = $otp[$email]??null;
        if ($rec && ($now-($rec['sent_at']??0))<OTP_RESEND_SECONDS)
            fail('Please wait a moment before requesting another code.',429);
        $code = str_pad((string)random_int(0,(10**OTP_LENGTH)-1),OTP_LENGTH,'0',STR_PAD_LEFT);
        $otp[$email]=['hash'=>hash('sha256',$code),'expires'=>$now+OTP_TTL_MIN*60,'sent_at'=>$now,'attempts'=>0];
        save_json(otp_file(),$otp);
        send_code_email($email,$code);
    }
    ok(['sent'=>true,'message'=>'If that email is authorized, a login code is on its way.']);
}
function do_verify_code($email, $code) {
    $email=strtolower(trim($email)); $code=trim($code);
    $otp=load_json(otp_file(),[]); $rec=$otp[$email]??null;
    if (!$rec) fail('No code requested for this email.');
    if (time()>($rec['expires']??0)){ unset($otp[$email]); save_json(otp_file(),$otp); fail('Code expired. Request a new one.'); }
    if (($rec['attempts']??0)>=OTP_MAX_ATTEMPTS){ unset($otp[$email]); save_json(otp_file(),$otp); fail('Too many attempts. Request a new code.',429); }
    if (!hash_equals($rec['hash'],hash('sha256',$code))){
        $otp[$email]['attempts']=($rec['attempts']??0)+1; save_json(otp_file(),$otp);
        fail('Incorrect code. Try again.',401);
    }
    unset($otp[$email]); save_json(otp_file(),$otp);
    if (!is_allowed_email($email)) fail('This email is not authorized.',403);
    $token=bin2hex(random_bytes(32));
    $sessions=load_json(sessions_file(),[]);
    foreach ($sessions as $t=>$s) if (($s['expires']??0)<time()) unset($sessions[$t]);
    $sessions[$token]=['email'=>$email,'created'=>time(),'expires'=>time()+SESSION_TTL_DAYS*86400,'last_seen'=>time()];
    save_json(sessions_file(),$sessions);
    ok(['session'=>$token,'email'=>$email,'role'=>role_of($email),'expires'=>$sessions[$token]['expires']]);
}
function current_session() {
    $token=$_SERVER['HTTP_X_SESSION']??($_GET['s']??''); if (!$token) return null;
    $s=load_json(sessions_file(),[]); $r=$s[$token]??null; if (!$r) return null;
    if (($r['expires']??0)<time()){ unset($s[$token]); save_json(sessions_file(),$s); return null; }
    return ['token'=>$token,'email'=>$r['email']];
}
function require_session(){ $s=current_session(); if (!$s) fail('Please log in.',401); return $s; }
function do_logout(){
    $t=$_SERVER['HTTP_X_SESSION']??'';
    if ($t){ $s=load_json(sessions_file(),[]); unset($s[$t]); save_json(sessions_file(),$s); }
    ok(['loggedout'=>true]);
}
