<?php
/**
 * Nova SS Asset Manager — API
 * ---------------------------
 * Single endpoint. The HTML page talks only to this file.
 * Login is required (email OTP -> session). Data stored as JSON + photos in
 * DATA_DIR, browsable from cPanel File Manager.
 */

require __DIR__ . '/config.php';

// --- CORS (frontend runs from a local file:// so Origin is "null") ----------
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type, X-Session');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

// --- Paths ------------------------------------------------------------------
$INVENTORY = DATA_DIR . '/inventory.json';
$CODES     = DATA_DIR . '/codes.json';
$TRANSFERS = DATA_DIR . '/transfers.json';
$PHOTODIR  = DATA_DIR . '/photos';
$EMPLOYEES = DATA_DIR . '/employees.json';
$EMPPHOTOS = DATA_DIR . '/emp_photos';
$STICKERDIR = DATA_DIR . '/stickers';

// --- Helpers ----------------------------------------------------------------
function fail($msg, $code = 400) {
    http_response_code($code);
    header('Content-Type: application/json');
    echo json_encode(['ok' => false, 'error' => $msg]);
    exit;
}
function ok($data = []) {
    header('Content-Type: application/json');
    echo json_encode(array_merge(['ok' => true], $data));
    exit;
}
function ensure_dirs() {
    global $PHOTODIR;
    if (!is_dir(DATA_DIR))  @mkdir(DATA_DIR, 0755, true);
    if (!is_dir($PHOTODIR)) @mkdir($PHOTODIR, 0755, true);
    if (!is_dir(DATA_DIR))  fail('Cannot create data directory. Check DATA_DIR and permissions.', 500);
}
function load_json($file, $default) {
    if (!file_exists($file)) return $default;
    $data = json_decode(file_get_contents($file), true);
    return is_array($data) ? $data : $default;
}
function save_json($file, $data) {
    $fp = fopen($file, 'c+');
    if (!$fp) fail('Cannot write data file: ' . basename($file), 500);
    flock($fp, LOCK_EX); ftruncate($fp, 0); rewind($fp);
    fwrite($fp, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));
    fflush($fp); flock($fp, LOCK_UN); fclose($fp);
}
function new_id() { return 'a_' . base_convert(time(), 10, 36) . '_' . bin2hex(random_bytes(3)); }
function now() { return date('c'); }
function body() {
    static $cached = null;
    if ($cached !== null) return $cached;
    $raw = file_get_contents('php://input');
    if ($raw) { $j = json_decode($raw, true); if (is_array($j)) return $cached = $j; }
    return $cached = $_POST;
}

require __DIR__ . '/auth.php';

ensure_dirs();
$action = $_GET['action'] ?? (body()['action'] ?? '');

// ===========================================================================
//  PUBLIC (no session): login flow
// ===========================================================================
if ($action === 'request_code') { $in = body(); do_request_code($in['email'] ?? ''); }
if ($action === 'verify_code')  { $in = body(); do_verify_code($in['email'] ?? '', $in['code'] ?? ''); }
if ($action === 'logout')       { do_logout(); }
if ($action === 'copy_helper') {
    // Opened from the email's "Copy code" link — auto-copies the code, then
    // offers one tap back into the app. Email clients block JS, so a real
    // clipboard copy can only happen on a page like this, outside the email.
    $c = preg_replace('/[^0-9]/', '', $_GET['c'] ?? '');
    header('Content-Type: text/html; charset=UTF-8');
    echo '<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Your code</title>
<link rel="icon" href="https://novass-inventory.vercel.app/logo-icon.png">
<style>*{box-sizing:border-box}body{font-family:system-ui,-apple-system,sans-serif;background:#EDEFF3;margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}
.c{background:#fff;border-radius:16px;padding:36px 30px;text-align:center;box-shadow:0 10px 40px rgba(0,0,0,.12);max-width:360px;width:100%}
.logo{width:52px;height:52px;margin:0 auto 16px;border-radius:10px;background:#001E46;padding:6px}
.logo img{width:100%;height:100%;object-fit:contain}
.lbl{font-size:11px;color:#8B95A3;text-transform:uppercase;letter-spacing:.08em;font-weight:700}
.code{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:44px;font-weight:800;letter-spacing:.18em;color:#001E46;margin:10px 0 4px;user-select:all}
.status{min-height:44px;display:flex;align-items:center;justify-content:center;gap:8px;font-size:14.5px;font-weight:600;margin:14px 0 20px}
.status.ok{color:#1E7A46}.status.err{color:#B4232A}
.checkmark{width:22px;height:22px;border-radius:50%;background:#1E7A46;color:#fff;display:flex;align-items:center;justify-content:center;font-size:13px;flex-shrink:0}
a.btn{display:block;background:#001E46;color:#fff;text-decoration:none;font-size:14.5px;font-weight:700;padding:13px;border-radius:10px;margin-top:6px}
button.retry{background:none;border:0;color:#5B6675;font-size:12.5px;text-decoration:underline;cursor:pointer;margin-top:10px;padding:4px}
</style></head><body>
<div class="c">
<div class="logo"><img src="https://novass-inventory.vercel.app/logo-icon.png" alt=""></div>
<div class="lbl">Your sign-in code</div>
<div class="code" id="code">'.htmlspecialchars($c).'</div>
<div class="status" id="status">Copying…</div>
<a class="btn" href="https://novass-inventory.vercel.app">← Back to Asset Manager</a>
<button class="retry" id="retryBtn" onclick="cp()" style="display:none">Try copying again</button>
</div>
<script>
const code="'.$c.'";
async function cp(){
  const st=document.getElementById("status"), rt=document.getElementById("retryBtn");
  try{
    await navigator.clipboard.writeText(code);
    st.className="status ok"; st.innerHTML=\'<span class="checkmark">✓</span> Copied — paste it in the app\';
    rt.style.display="none";
  }catch(e){
    st.className="status err"; st.textContent="Tap the code above to select, then copy manually";
    rt.style.display="inline";
  }
}
window.addEventListener("load",cp);
</script></body></html>';
    exit;
}

// ===========================================================================
//  Everything below requires a valid session
// ===========================================================================
$SESS = require_session();
$ROLE = role_of($SESS['email']);
if (!$ROLE) fail('Your access has been revoked.', 403);   // email removed after session was issued
function admin_only() { global $ROLE; if ($ROLE !== 'admin') fail('This action needs an admin account.', 403); }

if ($action === 'me') {
    ok(['email' => $SESS['email'], 'role' => $ROLE]);
}

if ($action === 'list') {
    $inv = load_json($INVENTORY, ['assets' => []]);
    ok(['assets' => $inv['assets'], 'categories' => $CATEGORY_CODES, 'software' => $SOFTWARE_CATEGORIES, 'email' => $SESS['email'], 'role' => $ROLE]);
}

// -------- USER MANAGEMENT (admin only) --------------------------------------
if ($action === 'list_users')  { admin_only(); do_list_users(); }
if ($action === 'add_user')    { admin_only(); $in = body(); do_add_user($in['email'] ?? '', $in['role'] ?? 'viewer', $SESS['email']); }
if ($action === 'remove_user') { admin_only(); $in = body(); do_remove_user($in['email'] ?? '', $SESS['email']); }

if ($action === 'get') {
    $id = $_GET['id'] ?? '';
    $inv = load_json($INVENTORY, ['assets' => []]);
    foreach ($inv['assets'] as $a) if ($a['id'] === $id) ok(['asset' => $a]);
    fail('Asset not found.', 404);
}

if ($action === 'transfers') {
    $log = load_json($TRANSFERS, ['transfers' => []]);
    $code = $_GET['code'] ?? '';
    $items = $log['transfers'];
    if ($code) $items = array_values(array_filter($items, fn($t) => ($t['code'] ?? '') === $code));
    ok(['transfers' => $items]);
}

// -------- CREATE ------------------------------------------------------------
if ($action === 'add') {
    admin_only();
    $in = body();
    $category = trim($in['category'] ?? '');
    $name     = trim($in['name'] ?? '');
    if ($name === '')     fail('Name is required.');
    if ($category === '') fail('Category is required.');

    $isSoftware = in_array($category, $SOFTWARE_CATEGORIES, true);
    $inv   = load_json($INVENTORY, ['assets' => []]);
    $codes = load_json($CODES, ['counters' => [], 'assigned' => []]);

    $code = null;
    if (!$isSoftware) {
        $tag = $CATEGORY_CODES[$category] ?? 'OT';
        $next = ($codes['counters'][$tag] ?? 0) + 1;
        $codes['counters'][$tag] = $next;
        $code = CODE_PREFIX . '-' . $tag . '-' . str_pad($next, CODE_PAD, '0', STR_PAD_LEFT);
    }

    $valueType = trim($in['value_type'] ?? 'one_time');
    if (!in_array($valueType, ['one_time','monthly','yearly'], true)) $valueType = 'one_time';
    $valueCurrency = trim($in['value_currency'] ?? 'BDT');
    if (!in_array($valueCurrency, ['BDT','USD'], true)) $valueCurrency = 'BDT';

    $asset = [
        'id' => new_id(), 'code' => $code, 'type' => $isSoftware ? 'software' : 'hardware',
        'category' => $category, 'name' => $name,
        'brand_model' => trim($in['brand_model'] ?? ''), 'serial' => trim($in['serial'] ?? ''),
        'specs' => trim($in['specs'] ?? ''), 'vendor' => trim($in['vendor'] ?? ''),
        'purchase_date' => trim($in['purchase_date'] ?? ''),
        'value_amount' => trim($in['value_amount'] ?? ''), 'value_currency' => $valueCurrency, 'value_type' => $valueType,
        'assigned_to' => trim($in['assigned_to'] ?? ''), 'employee_id' => trim($in['employee_id'] ?? ''), 'location' => trim($in['location'] ?? ''),
        'status' => 'active', 'notes' => trim($in['notes'] ?? ''), 'photos' => [], 'stickers' => [],
        'created_at' => now(), 'updated_at' => now(),
    ];
    if ($code) $codes['assigned'][$code] = $asset['id'];

    $inv['assets'][] = $asset;
    save_json($INVENTORY, $inv);
    if (!$isSoftware) save_json($CODES, $codes);
    ok(['asset' => $asset]);
}

// -------- UPDATE (never touches code/type/created_at/photos) ----------------
if ($action === 'update') {
    admin_only();
    $in = body();
    $id = $in['id'] ?? '';
    $inv = load_json($INVENTORY, ['assets' => []]);
    foreach ($inv['assets'] as &$a) {
        if ($a['id'] !== $id) continue;
        foreach (['name','brand_model','serial','specs','vendor','purchase_date','value_amount','assigned_to','employee_id','location','notes'] as $f)
            if (array_key_exists($f, $in)) $a[$f] = trim((string)$in[$f]);
        if (array_key_exists('value_currency', $in) && in_array($in['value_currency'], ['BDT','USD'], true)) $a['value_currency'] = $in['value_currency'];
        if (array_key_exists('value_type', $in) && in_array($in['value_type'], ['one_time','monthly','yearly'], true)) $a['value_type'] = $in['value_type'];
        $a['updated_at'] = now();
        save_json($INVENTORY, $inv);
        ok(['asset' => $a]);
    }
    fail('Asset not found.', 404);
}

// -------- REMOVE (soft delete; code stays reserved forever) -----------------
if ($action === 'remove') {
    admin_only();
    $in = body();
    $id = $in['id'] ?? '';
    $restore = !empty($in['restore']);
    $inv = load_json($INVENTORY, ['assets' => []]);
    foreach ($inv['assets'] as &$a) {
        if ($a['id'] !== $id) continue;
        $a['status'] = $restore ? 'active' : 'removed';
        $a['updated_at'] = now();
        save_json($INVENTORY, $inv);
        ok(['asset' => $a]);
    }
    fail('Asset not found.', 404);
}

// -------- TRANSFER ----------------------------------------------------------
if ($action === 'transfer') {
    admin_only();
    $in = body();
    $id = $in['id'] ?? '';
    $employeeId = trim($in['employee_id'] ?? '');
    $to = trim($in['to'] ?? '');   // display label ("Office" or employee name)
    $toLocation = trim($in['to_location'] ?? '');

    $inv = load_json($INVENTORY, ['assets' => []]);
    $log = load_json($TRANSFERS, ['transfers' => []]);
    // resolve current holder label for the log
    $emps = load_json(DATA_DIR . '/employees.json', ['employees' => []]);
    $nameOf = function($eid) use ($emps) {
        foreach ($emps['employees'] as $e) if ($e['id'] === $eid) return $e['name'];
        return '';
    };
    foreach ($inv['assets'] as &$a) {
        if ($a['id'] !== $id) continue;
        $fromLabel = !empty($a['employee_id']) ? $nameOf($a['employee_id']) : ($a['assigned_to'] ?: 'Office');
        $toLabel   = $to !== '' ? $to : ($employeeId ? $nameOf($employeeId) : 'Office');
        $entry = [
            'code' => $a['code'], 'asset_id' => $a['id'], 'asset_name' => $a['name'],
            'from' => $fromLabel, 'to' => $toLabel,
            'from_location' => $a['location'], 'to_location' => $toLocation,
            'by' => trim($in['by'] ?? '') ?: $SESS['email'], 'notes' => trim($in['notes'] ?? ''),
            'date' => now(),
        ];
        $a['employee_id'] = $employeeId;   // '' = Office
        $a['assigned_to'] = '';            // holder is tracked via employee_id now
        if ($toLocation !== '') $a['location'] = $toLocation;
        $a['updated_at'] = now();
        $log['transfers'][] = $entry;
        save_json($INVENTORY, $inv);
        save_json($TRANSFERS, $log);
        ok(['asset' => $a, 'transfer' => $entry]);
    }
    fail('Asset not found.', 404);
}

// -------- PHOTOS ------------------------------------------------------------
function photo_folder($asset) {
    global $PHOTODIR;
    $key = preg_replace('/[^A-Za-z0-9_\-]/', '_', $asset['code'] ?: $asset['id']);
    $dir = $PHOTODIR . '/' . $key;
    if (!is_dir($dir)) @mkdir($dir, 0755, true);
    return $dir;
}
if ($action === 'upload_photo') {
    admin_only();
    global $ALLOWED_PHOTO_EXT;
    $id = $_POST['id'] ?? '';
    if (!isset($_FILES['photo'])) fail('No photo received.');
    $f = $_FILES['photo'];
    if ($f['error'] !== UPLOAD_ERR_OK) fail('Upload failed (error ' . $f['error'] . ').');
    if ($f['size'] > MAX_FILE_BYTES) fail('Photo is too large (max 10 MB).');
    if ($f['size'] === 0) fail('The selected file was empty.');
    $ext = strtolower(pathinfo($f['name'], PATHINFO_EXTENSION));
    if (!in_array($ext, $ALLOWED_PHOTO_EXT, true)) fail('Only image files are allowed.');

    $inv = load_json($INVENTORY, ['assets' => []]);
    foreach ($inv['assets'] as &$a) {
        if ($a['id'] !== $id) continue;
        $stored = 'p_' . base_convert(time(), 10, 36) . '_' . bin2hex(random_bytes(3)) . '.' . $ext;
        if (!move_uploaded_file($f['tmp_name'], photo_folder($a) . '/' . $stored)) fail('Could not save the photo file.', 500);
        $photo = ['file' => $stored, 'original_name' => $f['name'], 'uploaded_at' => now(), 'deleted' => false, 'deleted_at' => null];
        $a['photos'][] = $photo;
        $a['updated_at'] = now();
        save_json($INVENTORY, $inv);
        ok(['photo' => $photo]);
    }
    fail('Asset not found.', 404);
}
if ($action === 'delete_photo' || $action === 'restore_photo') {
    admin_only();
    $in = body();
    $id = $in['id'] ?? ''; $file = $in['file'] ?? '';
    $del = ($action === 'delete_photo');
    $inv = load_json($INVENTORY, ['assets' => []]);
    foreach ($inv['assets'] as &$a) {
        if ($a['id'] !== $id) continue;
        foreach ($a['photos'] as &$p) {
            if ($p['file'] !== $file) continue;
            $p['deleted'] = $del; $p['deleted_at'] = $del ? now() : null;
            $a['updated_at'] = now();
            save_json($INVENTORY, $inv);
            ok(['photo' => $p]);
        }
        fail('Photo not found.', 404);
    }
    fail('Asset not found.', 404);
}
if ($action === 'photo') {
    $id = $_GET['id'] ?? '';
    $file = basename($_GET['file'] ?? '');
    $inv = load_json($INVENTORY, ['assets' => []]);
    foreach ($inv['assets'] as $a) {
        if ($a['id'] !== $id) continue;
        $path = photo_folder($a) . '/' . $file;
        if (!is_file($path)) fail('Photo file missing.', 404);
        $ext = strtolower(pathinfo($path, PATHINFO_EXTENSION));
        $mime = ['jpg'=>'image/jpeg','jpeg'=>'image/jpeg','png'=>'image/png','webp'=>'image/webp','gif'=>'image/gif'][$ext] ?? 'application/octet-stream';
        header('Content-Type: ' . $mime);
        header('Content-Length: ' . filesize($path));
        readfile($path);
        exit;
    }
    fail('Asset not found.', 404);
}


// -------- DOCUMENTS (PDF + images for receipts/invoices) --------------------
function doc_folder($asset) {
    global $PHOTODIR;
    $key = preg_replace('/[^A-Za-z0-9_\-]/', '_', $asset['code'] ?: $asset['id']);
    $dir = $PHOTODIR . '/' . $key . '_docs';
    if (!is_dir($dir)) @mkdir($dir, 0755, true);
    return $dir;
}
if ($action === 'upload_doc') {
    admin_only();
    global $ALLOWED_DOC_EXT;
    $id = $_POST['id'] ?? '';
    if (!isset($_FILES['doc'])) fail('No file received.');
    $f = $_FILES['doc'];
    if ($f['error'] !== UPLOAD_ERR_OK) fail('Upload failed (error '.$f['error'].').');
    if ($f['size'] > MAX_FILE_BYTES) fail('File too large (max 10 MB).');
    $ext = strtolower(pathinfo($f['name'], PATHINFO_EXTENSION));
    if (!in_array($ext, $ALLOWED_DOC_EXT, true)) fail('Only PDF, JPG, PNG, WEBP files are allowed.');
    $inv = load_json($INVENTORY, ['assets'=>[]]);
    foreach ($inv['assets'] as &$a) {
        if ($a['id'] !== $id) continue;
        $stored = 'd_'.base_convert(time(),10,36).'_'.bin2hex(random_bytes(3)).'.'.$ext;
        if (!move_uploaded_file($f['tmp_name'], doc_folder($a).'/'.$stored)) fail('Could not save file.',500);
        if (!isset($a['documents'])) $a['documents'] = [];
        $doc = ['file'=>$stored,'original_name'=>$f['name'],'uploaded_at'=>now(),'deleted'=>false,'deleted_at'=>null,'type'=>($ext==='pdf'?'pdf':'image')];
        $a['documents'][] = $doc;
        $a['updated_at'] = now();
        save_json($INVENTORY, $inv);
        ok(['doc'=>$doc]);
    }
    fail('Asset not found.',404);
}
if ($action === 'delete_doc' || $action === 'restore_doc') {
    admin_only();
    $in = body(); $id=$in['id']??''; $file=$in['file']??''; $del=($action==='delete_doc');
    $inv = load_json($INVENTORY,['assets'=>[]]);
    foreach ($inv['assets'] as &$a) {
        if ($a['id']!==$id) continue;
        foreach (($a['documents']??[]) as &$d) {
            if ($d['file']!==$file) continue;
            $d['deleted']=$del; $d['deleted_at']=$del?now():null;
            $a['updated_at']=now(); save_json($INVENTORY,$inv); ok(['doc'=>$d]);
        }
        fail('Document not found.',404);
    }
    fail('Asset not found.',404);
}
if ($action === 'doc') {
    $id=$_GET['id']??''; $file=basename($_GET['file']??'');
    $inv=load_json($INVENTORY,['assets'=>[]]);
    foreach ($inv['assets'] as $a) {
        if ($a['id']!==$id) continue;
        $path=doc_folder($a).'/'.$file;
        if (!is_file($path)) fail('File missing.',404);
        $ext=strtolower(pathinfo($path,PATHINFO_EXTENSION));
        $mime=['pdf'=>'application/pdf','jpg'=>'image/jpeg','jpeg'=>'image/jpeg','png'=>'image/png','webp'=>'image/webp','gif'=>'image/gif'][$ext]??'application/octet-stream';
        header('Content-Type: '.$mime);
        header('Content-Length: '.filesize($path));
        header('Content-Disposition: inline; filename="'.addslashes($file).'"');
        readfile($path); exit;
    }
    fail('Asset not found.',404);
}

// ===========================================================================
//  EMPLOYEES
// ===========================================================================

function emp_photo_folder($empId) {
    global $EMPPHOTOS;
    $key = preg_replace('/[^A-Za-z0-9_\-]/', '_', $empId);
    $dir = $EMPPHOTOS . '/' . $key;
    if (!is_dir($dir)) @mkdir($dir, 0755, true);
    return $dir;
}

if ($action === 'list_employees') {
    $emp = load_json($EMPLOYEES, ['employees' => []]);
    ok(['employees' => $emp['employees']]);
}

if ($action === 'add_employee') {
    admin_only();
    $in = body();
    $name = trim($in['name'] ?? '');
    if ($name === '') fail('Employee name is required.');
    $emp = load_json($EMPLOYEES, ['employees' => []]);
    $e = [
        'id'          => 'e_' . base_convert(time(), 10, 36) . '_' . bin2hex(random_bytes(3)),
        'name'        => $name,
        'designation' => trim($in['designation'] ?? ''),
        'contact'     => trim($in['contact'] ?? ''),
        'email'       => trim($in['email'] ?? ''),
        'photo'       => null,
        'created_at'  => now(),
        'updated_at'  => now(),
    ];
    $emp['employees'][] = $e;
    save_json($EMPLOYEES, $emp);
    ok(['employee' => $e]);
}

if ($action === 'update_employee') {
    admin_only();
    $in = body();
    $id = $in['id'] ?? '';
    $emp = load_json($EMPLOYEES, ['employees' => []]);
    foreach ($emp['employees'] as &$e) {
        if ($e['id'] !== $id) continue;
        foreach (['name','designation','contact','email'] as $f)
            if (array_key_exists($f, $in)) $e[$f] = trim((string)$in[$f]);
        $e['updated_at'] = now();
        save_json($EMPLOYEES, $emp);
        ok(['employee' => $e]);
    }
    fail('Employee not found.', 404);
}

if ($action === 'remove_employee') {
    admin_only();
    $in = body();
    $id = $in['id'] ?? '';
    $emp = load_json($EMPLOYEES, ['employees' => []]);
    $before = count($emp['employees']);
    $emp['employees'] = array_values(array_filter($emp['employees'], fn($e) => $e['id'] !== $id));
    if (count($emp['employees']) === $before) fail('Employee not found.', 404);
    save_json($EMPLOYEES, $emp);
    ok(['removed' => $id]);
}

if ($action === 'upload_emp_photo') {
    admin_only();
    global $ALLOWED_PHOTO_EXT;
    $id = $_POST['id'] ?? '';
    if (!isset($_FILES['photo'])) fail('No photo received.');
    $f = $_FILES['photo'];
    if ($f['error'] !== UPLOAD_ERR_OK) fail('Upload failed (error ' . $f['error'] . ').');
    if ($f['size'] === 0) fail('The selected file was empty.');
    if ($f['size'] > MAX_FILE_BYTES) fail('Photo too large (max 10 MB).');
    $ext = strtolower(pathinfo($f['name'], PATHINFO_EXTENSION));
    if (!in_array($ext, $ALLOWED_PHOTO_EXT, true)) fail('Only image files are allowed.');
    $emp = load_json($EMPLOYEES, ['employees' => []]);
    foreach ($emp['employees'] as &$e) {
        if ($e['id'] !== $id) continue;
        $dir = emp_photo_folder($id);
        // clear old
        foreach (glob($dir . '/*') as $old) @unlink($old);
        $stored = 'ep_' . bin2hex(random_bytes(4)) . '.' . $ext;
        if (!move_uploaded_file($f['tmp_name'], $dir . '/' . $stored)) fail('Could not save the photo.', 500);
        $e['photo'] = $stored;
        $e['updated_at'] = now();
        save_json($EMPLOYEES, $emp);
        ok(['photo' => $stored]);
    }
    fail('Employee not found.', 404);
}

if ($action === 'emp_photo') {
    $id = $_GET['id'] ?? '';
    $file = basename($_GET['file'] ?? '');
    $path = emp_photo_folder($id) . '/' . $file;
    if (!is_file($path)) fail('Photo missing.', 404);
    $ext = strtolower(pathinfo($path, PATHINFO_EXTENSION));
    $mime = ['jpg'=>'image/jpeg','jpeg'=>'image/jpeg','png'=>'image/png','webp'=>'image/webp','gif'=>'image/gif'][$ext] ?? 'application/octet-stream';
    header('Content-Type: ' . $mime);
    header('Content-Length: ' . filesize($path));
    readfile($path);
    exit;
}

// ===========================================================================
//  STICKERS — one physical label per (asset, label) name, generated once,
//  permanently stored so it can be viewed/downloaded again anytime.
// ===========================================================================
function sticker_folder($code) {
    global $STICKERDIR;
    $key = preg_replace('/[^A-Za-z0-9_\-]/', '_', $code);
    $dir = $STICKERDIR . '/' . $key;
    if (!is_dir($dir)) @mkdir($dir, 0755, true);
    return $dir;
}
function label_slug($label) {
    $s = strtolower(trim($label));
    $s = preg_replace('/[^a-z0-9]+/', '-', $s);
    return trim($s, '-') ?: 'label';
}

if ($action === 'list_stickers') {
    $id = $_GET['asset_id'] ?? '';
    $inv = load_json($INVENTORY, ['assets' => []]);
    foreach ($inv['assets'] as $a) if ($a['id'] === $id) ok(['stickers' => $a['stickers'] ?? []]);
    fail('Asset not found.', 404);
}

if ($action === 'generate_sticker') {
    admin_only();
    $id    = $_POST['asset_id'] ?? '';
    $label = trim($_POST['label'] ?? '');
    if ($label === '') fail('Enter a label for this sticker (e.g. Laptop, Box, Charger).');
    if (!isset($_FILES['png'])) fail('No sticker image received.');
    $f = $_FILES['png'];
    if ($f['error'] !== UPLOAD_ERR_OK) fail('Upload failed (error ' . $f['error'] . ').');
    if ($f['size'] === 0) fail('The generated image was empty — please try again.');
    if ($f['size'] > MAX_FILE_BYTES) fail('Sticker image too large.');

    $inv = load_json($INVENTORY, ['assets' => []]);
    foreach ($inv['assets'] as &$a) {
        if ($a['id'] !== $id) continue;
        if (empty($a['code'])) fail('This item has no sticker code (software items are not stickered).');
        $slug = label_slug($label);
        $existing = $a['stickers'] ?? [];
        foreach ($existing as $s) {
            if (label_slug($s['label']) === $slug) {
                fail('A sticker labeled "' . $s['label'] . '" already exists for this item. Downloaded stickers are never regenerated — pick a different label (e.g. Box, Charger) for another copy.', 409);
            }
        }
        $dir = sticker_folder($a['code']);
        $stored = $slug . '_' . bin2hex(random_bytes(3)) . '.png';
        if (!move_uploaded_file($f['tmp_name'], $dir . '/' . $stored)) fail('Could not save the sticker file.', 500);
        $rec = [
            'id' => 'st_' . bin2hex(random_bytes(4)),
            'label' => $label, 'file' => $stored,
            'created_at' => now(), 'created_by' => $SESS['email'],
        ];
        $a['stickers'] = $existing;
        $a['stickers'][] = $rec;
        $a['updated_at'] = now();
        save_json($INVENTORY, $inv);
        ok(['sticker' => $rec]);
    }
    fail('Asset not found.', 404);
}

if ($action === 'sticker_file') {
    $id = $_GET['asset_id'] ?? '';
    $file = basename($_GET['file'] ?? '');
    $inv = load_json($INVENTORY, ['assets' => []]);
    foreach ($inv['assets'] as $a) {
        if ($a['id'] !== $id) continue;
        $path = sticker_folder($a['code'] ?? $id) . '/' . $file;
        if (!is_file($path)) fail('Sticker file missing.', 404);
        header('Content-Type: image/png');
        header('Content-Length: ' . filesize($path));
        header('Content-Disposition: inline; filename="' . addslashes($file) . '"');
        readfile($path); exit;
    }
    fail('Asset not found.', 404);
}

fail('Unknown action.', 404);
