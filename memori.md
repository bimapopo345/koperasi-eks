# Dokumentasi Lengkap Aplikasi Koperasi CodeIgniter 4

## 📋 Daftar Isi

1. [Arsitektur Aplikasi](#arsitektur-aplikasi)
2. [Struktur Database & Models](#struktur-database--models)
3. [Sistem Routing](#sistem-routing)
4. [Controllers & Logic](#controllers--logic)
5. [Views & UI Components](#views--ui-components)
6. [Fitur-Fitur Utama](#fitur-fitur-utama)
7. [Assets & Dependencies](#assets--dependencies)
8. [Mapping untuk MERN Stack](#mapping-untuk-mern-stack)

---

## 🏗️ Arsitektur Aplikasi

### Framework & Technology Stack

- **Backend Framework**: CodeIgniter 4
- **Database**: MySQL dengan MySQLi driver
- **Frontend**: Bootstrap 5 + Custom CSS
- **JavaScript**: jQuery 3.7.1
- **Icons**: Tabler Icons, Feather Icons
- **Template**: Admin dashboard template dengan sidebar

### Struktur Direktori

```
koperasi/
├── app/
│   ├── Config/
│   │   ├── Database.php (konfigurasi database)
│   │   ├── Routes.php (definisi route)
│   │   └── ...
│   ├── Controllers/
│   │   ├── Auth.php (autentikasi)
│   │   ├── Member.php (management anggota)
│   │   ├── Product/Deposit.php (produk simpanan)
│   │   └── Savings/Deposit.php (transaksi setoran)
│   ├── Models/
│   │   ├── MUsers.php (model users)
│   │   ├── MMember.php (model member)
│   │   ├── Product/MProductDeposit.php
│   │   └── Savings/MDeposit.php
│   ├── Views/
│   │   ├── main_layout.php (layout utama)
│   │   ├── auth/ (halaman login/register)
│   │   ├── member/ (halaman member)
│   │   ├── product/ (halaman produk)
│   │   └── savings/ (halaman simpanan)
│   └── Database/
│       └── Migrations/
└── public/
    ├── assets/ (CSS, JS, images)
    └── uploads/ (file upload)
```

---

## 🗄️ Struktur Database & Models

### 1. Tabel `users` (Autentikasi)

```sql
CREATE TABLE users (
    id INT(11) AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at DATETIME NULL,
    updated_at DATETIME NULL
);
```

**Model: MUsers.php**

```php
class MUsers extends Model {
    protected $table = 'users';
    protected $primaryKey = 'id';
    protected $allowedFields = ['username', 'password'];
}
```

### 2. Tabel `member` (Data Anggota)

```sql
CREATE TABLE member (
    id INT(11) AUTO_INCREMENT PRIMARY KEY,
    uuid VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    gender ENUM('L', 'P') NOT NULL,
    phone VARCHAR(20),
    city VARCHAR(100),
    complete_address TEXT,
    created_at DATETIME
);
```

**Model: MMember.php**

```php
class MMember extends Model {
    protected $table = 'member';
    protected $primaryKey = 'id';
    protected $allowedFields = [
        "uuid", "name", "gender", "phone",
        "city", "complete_address", "created_at"
    ];
}
```

### 3. Tabel `product_deposit` (Produk Simpanan)

```sql
CREATE TABLE product_deposit (
    id INT(11) AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    deposit_amount DECIMAL(15,2) NOT NULL,
    return_profit DECIMAL(5,2) NOT NULL,
    term_duration INT(11) NOT NULL,
    notes TEXT
);
```

**Model: MProductDeposit.php**

```php
class MProductDeposit extends Model {
    protected $table = 'product_deposit';
    protected $primaryKey = 'id';
    protected $allowedFields = [
        "title", "deposit_amount", "return_profit",
        "term_duration", "notes"
    ];
}
```

### 4. Tabel `deposit` (Transaksi Setoran)

```sql
CREATE TABLE deposit (
    id INT(11) AUTO_INCREMENT PRIMARY KEY,
    uuid VARCHAR(50) UNIQUE NOT NULL,
    installment_period INT(11) NOT NULL,
    member_id INT(11) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    deposit_date DATE NOT NULL,
    proof_file VARCHAR(255),
    description TEXT,
    created_at DATETIME,
    FOREIGN KEY (member_id) REFERENCES member(id)
);
```

**Model: MDeposit.php**

```php
class MDeposit extends Model {
    protected $table = 'deposit';
    protected $primaryKey = 'id';
    protected $allowedFields = [
        "uuid", "installment_period", "member_id",
        "amount", "deposit_date", "proof_file",
        "description", "created_at"
    ];
}
```

---

## 🛣️ Sistem Routing

### Konfigurasi Routes (app/Config/Routes.php)

#### 1. Route Autentikasi

```php
$routes->get('/', 'Auth::index');
$routes->get('/login', 'Auth::index');
$routes->post('/auth', 'Auth::auth');
$routes->get('/register', 'Auth::register');
$routes->post('/register/save', 'Auth::saveRegister');
$routes->get('/logout', 'Auth::logout');
```

#### 2. Route Member Management

```php
$routes->group("member", static function ($member) {
    $member->get("/", "Member::index");
    $member->get("new", "Member::formCreate");
    $member->get("edit/(:num)", "Member::formEdit/$1");
    $member->get("ajax/id-validation", "Member::idValidation");
    $member->get("delete/(:num)", "Member::delete/$1");
    $member->post("create", "Member::create");
});
```

#### 3. Route Produk Simpanan

```php
$routes->group("product", static function ($product) {
    $product->group("deposit", static function ($deposit) {
        $deposit->get("/", "Product\Deposit::index");
        $deposit->get("delete/(:num)", "Product\Deposit::delete/$1");
        $deposit->get("ajax/get-detail/(:num)", "Product\Deposit::getDetail/$1");
        $deposit->post("create", "Product\Deposit::create");
    });
});
```

#### 4. Route Simpanan/Setoran

```php
$routes->group("savings", static function ($savings) {
    $savings->group("deposit", static function ($deposit) {
        $deposit->get("/", "Savings\Deposit::index");
        $deposit->get("create", "Savings\Deposit::formCreate");
        $deposit->get("member-lates-period/(:num)", "Savings\Deposit::getMemberLatestPeriod/$1");
        $deposit->post("create", "Savings\Deposit::create");
        $deposit->get("ajax/id-validation", "Savings\Deposit::idValidation");
        $deposit->get("delete/(:num)", "Savings\Deposit::delete/$1");
    });
});
```

---

## 🎮 Controllers & Logic

### 1. Auth Controller (app/Controllers/Auth.php)

#### Fungsi-fungsi utama:

- **index()**: Menampilkan halaman login
- **auth()**: Proses autentikasi login
- **register()**: Menampilkan halaman registrasi
- **saveRegister()**: Proses registrasi user baru
- **logout()**: Proses logout dan destroy session

#### Logic autentikasi:

```php
public function auth() {
    $username = $this->request->getPost('username');
    $password = $this->request->getPost('password');

    $user = $this->MUsers->where('username', $username)->first();

    if (!$user || !password_verify($password, $user['password'])) {
        return redirect()->back()->with('error', 'Username atau password salah.');
    }

    session()->set([
        'user_id' => $user['id'],
        'username' => $user['username'],
        'isLoggedIn' => true
    ]);

    return redirect()->to('/member');
}
```

### 2. Member Controller (app/Controllers/Member.php)

#### Fungsi-fungsi utama:

- **index()**: Menampilkan daftar semua anggota
- **formCreate()**: Form tambah anggota baru
- **formEdit($id)**: Form edit anggota
- **create()**: Proses tambah anggota
- **delete($id)**: Hapus anggota
- **idValidation()**: AJAX validasi UUID anggota

#### Logic CRUD Member:

```php
public function create() {
    $req = $this->request->getPost();

    // Validasi UUID duplicate
    $idValidation = $this->member->where("uuid", $req["member_id"])->find();
    if (!empty($idValidation)) {
        return redirect()->to("member/new")->with("message", "ID anggota sudah ada");
    }

    $this->member->insert([
        "uuid" => $req["member_id"],
        "name" => $req["member_name"],
        "gender" => $req["member_gender"],
        "phone" => $req["member_phone_number"],
        "city" => $req["member_city"],
        "complete_address" => $req["member_full_address"]
    ]);

    return redirect()->to("member");
}
```

### 3. Product Deposit Controller (app/Controllers/Product/Deposit.php)

#### Fungsi-fungsi utama:

- **index()**: Menampilkan daftar produk simpanan
- **create()**: Tambah produk simpanan baru
- **getDetail($id)**: AJAX get detail produk
- **delete($id)**: Hapus produk
- **update()**: Update produk

### 4. Savings Deposit Controller (app/Controllers/Savings/Deposit.php)

#### Fungsi-fungsi utama:

- **index()**: Daftar transaksi setoran (dengan JOIN member)
- **formCreate()**: Form setoran baru
- **create()**: Proses setoran + upload bukti
- **delete($id)**: Hapus transaksi
- **getMemberLatestPeriod($memberId)**: AJAX get periode terbaru member

#### Logic Upload File:

```php
$file = $this->request->getFile('proof_file');
if ($file && $file->isValid() && !$file->hasMoved()) {
    $cleanName = strtoupper(preg_replace("/[^a-zA-Z0-9]/", "_", $member['uuid']));
    $timestamp = date("Ymd_His");
    $ext = $file->getExtension();
    $fileName = "PAYMENT_{$cleanName}_{$timestamp}.{$ext}";
    $file->move('uploads/bukti', $fileName);
}
```

---

## 🎨 Views & UI Components

### 1. Layout Utama (app/Views/main_layout.php)

#### Struktur HTML:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <!-- Meta tags, CSS links -->
    <?= $this->
    renderSection("header") ?>
    <link rel="stylesheet" href="/assets/css/style.css" />
  </head>
  <body>
    <div class="loader-bg">...</div>

    <?= $this->include('partials/sidebar') ?>
    <?= $this->include('partials/topbar') ?>

    <div class="pc-container">
      <div class="pc-content"><?= $this->renderSection("content") ?></div>
    </div>

    <footer class="pc-footer">...</footer>

    <?= $this->renderSection("modal") ?>
    <?= $this->renderSection("script") ?>
  </body>
</html>
```

### 2. Sidebar Navigation (app/Views/partials/sidebar.php)

#### Menu Structure:

```html
<nav class="pc-sidebar">
  <div class="navbar-wrapper">
    <div class="m-header">
      <a href="#" class="b-brand">
        <img src="/assets/images/logo-dark.png" alt="logo" />
      </a>
    </div>
    <div class="navbar-content">
      <ul class="pc-navbar">
        <li class="pc-item">
          <a href="/dashboard" class="pc-link">Dashboard</a>
        </li>

        <!-- Simpanan Section -->
        <li class="pc-item pc-caption">
          <label>Simpanan</label>
        </li>
        <li class="pc-item">
          <a href="/savings/deposit" class="pc-link">Setoran</a>
        </li>
        <li class="pc-item">
          <a href="/savings/withdraw" class="pc-link">Penarikan</a>
        </li>

        <!-- Master Data Section -->
        <li class="pc-item pc-caption">
          <label>Master Data</label>
        </li>
        <li class="pc-item">
          <a href="/member" class="pc-link">Anggota</a>
        </li>
        <li class="pc-item pc-hasmenu">
          <a href="#!" class="pc-link">Produk</a>
          <ul class="pc-submenu">
            <li><a href="/product/deposit">Simpanan</a></li>
            <li><a href="/product/loan">Pinjaman</a></li>
          </ul>
        </li>
      </ul>
    </div>
  </div>
</nav>
```

### 3. Form Components

#### Form Member (app/Views/member/V_createMember.php):

```php
<?= form_open("member/create") ?>
<div class="form-group">
    <label>ID Anggota</label>
    <input type="text" name="member_id" class="form-control" required>
</div>
<div class="form-group">
    <label>Nama Lengkap</label>
    <input type="text" name="member_name" class="form-control" required>
</div>
<div class="form-group">
    <label>Jenis Kelamin</label>
    <select name="member_gender" class="form-control" required>
        <option value="L">Laki-laki</option>
        <option value="P">Perempuan</option>
    </select>
</div>
<!-- dst... -->
<?= form_close() ?>
```

#### Modal Components (Bootstrap Modal):

```html
<div class="modal fade" id="insertDepositProductModal">
  <div class="modal-dialog">
    <form method="post" action="/product/deposit/create" class="modal-content">
      <div class="modal-header">
        <h5>Tambah Produk Deposito</h5>
        <button
          type="button"
          class="btn-close"
          data-bs-dismiss="modal"
        ></button>
      </div>
      <div class="modal-body">
        <!-- Form fields -->
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
          Batal
        </button>
        <button type="submit" class="btn btn-primary">Simpan</button>
      </div>
    </form>
  </div>
</div>
```

---

## ⚡ Fitur-Fitur Utama

### 1. Sistem Autentikasi

- **Login**: Username + password dengan hash verification
- **Session Management**: Menyimpan user_id, username, isLoggedIn
- **Registration**: Hash password dengan PASSWORD_DEFAULT
- **Logout**: Destroy semua session data

### 2. Management Anggota (Member)

- **CRUD Operations**: Create, Read, Update, Delete
- **UUID Validation**: AJAX validation untuk cek duplicate ID
- **Data Fields**: UUID, nama, gender, phone, city, alamat lengkap
- **Real-time Validation**: JavaScript validation sebelum submit

### 3. Management Produk Simpanan

- **Modal-based Forms**: Bootstrap modal untuk input/edit
- **CRUD Operations**: Tambah, edit, hapus produk
- **Data Fields**: Title, deposit amount, profit percentage, term duration
- **AJAX Operations**: Get detail produk untuk edit form

### 4. Sistem Setoran (Deposits)

- **File Upload**: Upload bukti pembayaran dengan naming convention
- **Auto Period**: Otomatis increment periode setoran per member
- **Member Selection**: Dropdown selection member
- **UUID Generation**: Auto generate UUID untuk transaksi
- **JOIN Query**: Menampilkan data setoran dengan nama member

### 5. Validasi & Error Handling

- **Form Validation**: Required fields, data types
- **File Upload Validation**: File type, size, naming
- **Duplicate Prevention**: UUID validation untuk member dan transaksi
- **Flash Messages**: Success/error messages dengan session flashdata

---

## 🎯 Assets & Dependencies

### 1. CSS Framework & Styling

```html
<!-- Core CSS -->
<link rel="stylesheet" href="/assets/css/style.css" />
<link rel="stylesheet" href="/assets/css/style-preset.css" />

<!-- Icon Sets -->
<link rel="stylesheet" href="/assets/fonts/tabler-icons.min.css" />
<link rel="stylesheet" href="/assets/fonts/feather.css" />
<link rel="stylesheet" href="/assets/fonts/fontawesome.css" />

<!-- External Libraries -->
<link rel="stylesheet" href="https://alb-cdn.web.app/popupjs/pu.min.css" />
```

### 2. JavaScript Libraries

```html
<!-- Core JS -->
<script src="/assets/js/jquery-3.7.1.min.js"></script>
<script src="/assets/js/plugins/bootstrap.min.js"></script>
<script src="/assets/js/pcoded.js"></script>

<!-- External Libraries -->
<script src="https://alb-cdn.web.app/popupjs/pu.min.js"></script>
```

### 3. File Upload Configuration

- **Upload Path**: `public/uploads/bukti/`
- **Naming Convention**: `PAYMENT_{MEMBER_UUID}_{TIMESTAMP}.{EXT}`
- **Allowed Extensions**: Image files (jpg, png, pdf, etc.)

---

## 🔄 Mapping untuk MERN Stack

### 1. Backend (Node.js + Express)

#### Database Migration (MongoDB):

```javascript
// Users Schema
const userSchema = {
  username: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
};

// Member Schema
const memberSchema = {
  uuid: { type: String, unique: true, required: true },
  name: { type: String, required: true },
  gender: { type: String, enum: ["L", "P"], required: true },
  phone: String,
  city: String,
  completeAddress: String,
  createdAt: { type: Date, default: Date.now },
};

// Product Deposit Schema
const productDepositSchema = {
  title: { type: String, required: true },
  depositAmount: { type: Number, required: true },
  returnProfit: { type: Number, required: true },
  termDuration: { type: Number, required: true },
  notes: String,
};

// Deposit Schema
const depositSchema = {
  uuid: { type: String, unique: true, required: true },
  installmentPeriod: { type: Number, required: true },
  memberId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Member",
    required: true,
  },
  amount: { type: Number, required: true },
  depositDate: { type: Date, required: true },
  proofFile: String,
  description: String,
  createdAt: { type: Date, default: Date.now },
};
```

#### API Routes (Express):

```javascript
// Auth Routes
app.post("/api/auth/login", authController.login);
app.post("/api/auth/register", authController.register);
app.post("/api/auth/logout", authController.logout);

// Member Routes
app.get("/api/members", memberController.index);
app.post("/api/members", memberController.create);
app.get("/api/members/:id", memberController.show);
app.put("/api/members/:id", memberController.update);
app.delete("/api/members/:id", memberController.delete);
app.get("/api/members/validate/:uuid", memberController.validateUuid);

// Product Routes
app.get("/api/products/deposits", productController.index);
app.post("/api/products/deposits", productController.create);
app.get("/api/products/deposits/:id", productController.show);
app.put("/api/products/deposits/:id", productController.update);
app.delete("/api/products/deposits/:id", productController.delete);

// Savings Routes
app.get("/api/savings/deposits", savingsController.index);
app.post(
  "/api/savings/deposits",
  upload.single("proofFile"),
  savingsController.create
);
app.delete("/api/savings/deposits/:id", savingsController.delete);
app.get(
  "/api/savings/deposits/member/:memberId/latest-period",
  savingsController.getLatestPeriod
);
```

### 2. Frontend (React)

#### Component Structure:

```
src/
├── components/
│   ├── Auth/
│   │   ├── Login.jsx
│   │   └── Register.jsx
│   ├── Layout/
│   │   ├── MainLayout.jsx
│   │   ├── Sidebar.jsx
│   │   └── Topbar.jsx
│   ├── Member/
│   │   ├── MemberList.jsx
│   │   ├── MemberForm.jsx
│   │   └── MemberEdit.jsx
│   ├── Product/
│   │   ├── ProductDepositList.jsx
│   │   └── ProductDepositModal.jsx
│   └── Savings/
│       ├── DepositList.jsx
│       └── DepositForm.jsx
├── pages/
│   ├── Dashboard.jsx
│   ├── MemberPage.jsx
│   ├── ProductPage.jsx
│   └── SavingsPage.jsx
├── hooks/
│   ├── useAuth.js
│   ├── useApi.js
│   └── useFileUpload.js
├── services/
│   ├── authService.js
│   ├── memberService.js
│   ├── productService.js
│   └── savingsService.js
└── utils/
    ├── constants.js
    ├── helpers.js
    └── validation.js
```

#### State Management (Context API):

```javascript
// AuthContext
const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const login = async (credentials) => {
    const response = await authService.login(credentials);
    setUser(response.user);
    setIsAuthenticated(true);
    localStorage.setItem("token", response.token);
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem("token");
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
```

### 3. Key Conversion Points

#### Form Handling:

- **CodeIgniter**: Server-side form processing dengan $this->request->getPost()
- **React**: Client-side dengan useState dan controlled components

#### File Upload:

- **CodeIgniter**: $this->request->getFile() dengan move() method
- **React**: FormData dengan fetch/axios untuk multipart upload

#### Validation:

- **CodeIgniter**: Server-side validation dengan built-in rules
- **React**: Client-side validation dengan libraries seperti Formik + Yup

#### Session Management:

- **CodeIgniter**: PHP sessions dengan session()->set()
- **React**: JWT tokens dengan localStorage/cookies

#### Database Queries:

- **CodeIgniter**: Query Builder dengan method chaining
- **React/Node**: Mongoose ODM dengan async/await patterns

---

## 📝 Catatan Migrasi

### 1. Prioritas Fitur

1. **Phase 1**: Auth system + Member management
2. **Phase 2**: Product management
3. **Phase 3**: Savings/Deposit system dengan file upload
4. **Phase 4**: Reporting dan analytics

### 2. Technical Considerations

- **Database**: Migrasi dari MySQL ke MongoDB
- **File Upload**: Dari local storage ke cloud storage (AWS S3/Cloudinary)
- **Authentication**: Dari PHP sessions ke JWT tokens
- **Real-time**: Pertimbangkan Socket.io untuk real-time updates

### 3. UI/UX Improvements

- **Responsive Design**: Mobile-first approach
- **Progressive Web App**: Offline capabilities
- **Modern UI**: Material-UI atau Ant Design
- **Performance**: Code splitting dan lazy loading

---

_Dokumentasi ini dibuat untuk memfasilitasi migrasi dari CodeIgniter 4 ke MERN Stack dengan mempertahankan semua fungsi dan fitur yang ada._
