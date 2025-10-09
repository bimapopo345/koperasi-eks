# Konteks Proyek: MERN Koperasi (Analisis Mendalam)

Dokumen ini memberikan ringkasan teknis yang mendalam dari proyek "MERN Koperasi" berdasarkan analisis seluruh file kode sumber di `client/src` dan `server/src`.

## 1. Gambaran Umum & Tumpukan Teknologi

Aplikasi ini adalah sistem manajemen koperasi berbasis web dengan tumpukan teknologi MERN (MongoDB, Express.js, React, Node.js).

- **Backend**: Node.js & Express.js, Mongoose ODM, JWT untuk autentikasi, dan Joi untuk validasi.
- **Frontend**: React (dengan Vite), Redux (untuk autentikasi), React Router, Tailwind CSS, dan Axios untuk komunikasi API.
- **Development**: `concurrently` untuk menjalankan kedua server, `nodemon` untuk hot-reload backend.

## 2. Arsitektur & Alur Data Backend (`server/src`)

Backend dibangun dengan Express.js dan mengikuti pola Model-View-Controller (MVC) yang dimodifikasi.

### 2.1. Models (Mongoose Schemas)

Lokasi: `server/src/models/`

- **`user.model.js`**: Skema untuk pengguna (termasuk admin dan staff). Memiliki *pre-save hook* untuk **hashing password** menggunakan `bcryptjs` dan **pembuatan UUID otomatis**. Menyembunyikan password saat di-serialisasi ke JSON.
- **`member.model.js`**: Skema untuk anggota koperasi. Terhubung ke model `User` (relasi one-to-one) dan `Product`. Memiliki *pre-save hook* untuk pembuatan UUID otomatis.
- **`product.model.js`**: Skema untuk produk simpanan (misal: Simpanan Harian). Menyimpan detail seperti setoran minimum, keuntungan, dan durasi.
- **`loanProduct.model.js`**: Skema untuk produk pinjaman. Menyimpan detail seperti plafon, DP, dan suku bunga.
- **`savings.model.js`**: Skema untuk transaksi simpanan (setoran/penarikan). Terhubung ke `Member` dan `Product`. Memiliki *pre-save hook* untuk pembuatan UUID.

### 2.2. Controllers

Lokasi: `server/src/controllers/`

- **`auth.controller.js`**: Menangani logika untuk registrasi dan login. Membuat JWT setelah login berhasil.
- **`member.controller.js`**: Mengelola CRUD untuk anggota. Saat membuat anggota baru, controller ini juga **membuat entitas `User` yang terkait**. Saat mengambil daftar anggota, ia juga **menghitung total simpanan** untuk setiap anggota melalui agregasi.
- **`product.controller.js` & `loanProduct.controller.js`**: Implementasi CRUD standar. Memiliki fungsi untuk *toggle* status `isActive`.
- **`savings.controller.js`**: Logika paling kompleks. Menangani pembuatan dan pembaruan transaksi simpanan, termasuk **mengelola unggahan file bukti** melalui `multer`. Melakukan validasi penting seperti **mencegah duplikasi `installmentPeriod`** untuk anggota dan produk yang sama.
- **`dashboard.controller.js`**: Menyediakan data agregat untuk halaman dashboard frontend. Menggunakan *aggregation pipeline* MongoDB untuk menghitung total anggota, total simpanan, dan statistik bulanan untuk grafik.

### 2.3. Routes

Lokasi: `server/src/routes/`

- **`index.js`**: Titik masuk utama yang menggabungkan semua rute lain di bawah prefix `/api`.
- **Middleware**: Rute-rute diamankan menggunakan middleware `verifyToken` (`auth.middleware.js`) yang memeriksa validitas JWT. Beberapa rute juga memiliki middleware `requireAdmin` untuk kontrol akses berbasis peran.
- **`public.routes.js`**: Mengekspos beberapa endpoint yang **tidak memerlukan autentikasi**. Ini digunakan oleh skrip PHP eksternal untuk mengambil data anggota dan simpanan secara publik dan aman.
- **`savings.routes.js`**: Menggunakan `multer` untuk menangani `multipart/form-data` pada endpoint `POST` dan `PUT` untuk unggahan file bukti transaksi.

### 2.4. Validasi

- **`savings.validation.js`**: Menggunakan `Joi` untuk mendefinisikan skema validasi yang ketat untuk request body pada endpoint simpanan, memastikan integritas data sebelum diproses oleh controller.

## 3. Arsitektur & Alur Data Frontend (`client/src`)

Frontend adalah Single Page Application (SPA) yang dibangun dengan React dan Vite.

### 3.1. Konfigurasi & Entry Point

- **`main.jsx`**: Titik masuk aplikasi. Me-render komponen `App` di dalam `Provider` Redux.
- **`App.jsx`**: Komponen root yang mengatur `RouterProvider` (dari React Router), dan `PersistGate` (dari Redux Persist) yang memastikan state autentikasi dimuat sebelum aplikasi ditampilkan.

### 3.2. State Management (Redux)

- **`store/store.js`**: Mengkonfigurasi Redux store. Menggunakan `redux-persist` untuk menyimpan *slice* `auth` ke dalam `localStorage`, sehingga status login pengguna tetap ada setelah me-refresh halaman.
- **`store/authSlice.js`**: Slice Redux yang sederhana, hanya mengelola `status` (boolean login) dan `userData`.
- **State Lokal**: Sebagian besar state lainnya (data form, loading, error, data dari API) dikelola di dalam komponen masing-masing menggunakan hook `useState` dan `useEffect`.

### 3.3. Komunikasi API

- **`api/authApi.jsx`**: Mengkonfigurasi instance `axios` global. Di sinilah **interceptor** didefinisikan:
  - **Request Interceptor**: Secara otomatis menyisipkan token JWT dari `localStorage` ke dalam header `Authorization` di setiap request.
  - **Response Interceptor**: Menangani error `401 Unauthorized`. Jika token kedaluwarsa atau tidak valid, ia akan secara otomatis membersihkan `localStorage` dan mengarahkan pengguna ke halaman login.
- **`api/savingsApi.jsx`**: Instance axios lain yang dikhususkan untuk API simpanan, menunjukkan cara penggunaan `FormData` untuk mengirim file.

### 3.4. Routing & Layout

- **`routes/index.jsx`**: Mendefinisikan semua rute aplikasi menggunakan `createBrowserRouter`.
- **`Layout/`**: Komponen `MainLayout.jsx` (dengan `Sidebar` dan `Topbar`) dan `AuthLayout.jsx` (kosong, untuk login) digunakan untuk memberikan tampilan yang konsisten di berbagai halaman.
- **`utils/PrivateRoute.jsx`**: Komponen *Higher-Order* yang melindungi rute. Ia memeriksa status autentikasi dari Redux **dan** keberadaan token di `localStorage` sebelum memberikan akses. Jika tidak terautentikasi, pengguna diarahkan ke `/login`.

### 3.5. Halaman & Komponen Utama

- **`pages/`**: Berisi komponen level atas untuk setiap rute.
  - **`Dashboard.jsx`**: Mengambil data ringkasan dari endpoint `/api/admin/dashboard` dan menampilkannya dalam kartu statistik dan grafik (menggunakan `chart.js`).
  - **`Members.jsx`, `Products.jsx`, `LoanProducts.jsx`**: Halaman CRUD standar. Mereka mengambil daftar data, menampilkannya dalam tabel, dan menggunakan **modal form** untuk operasi buat/edit.
  - **`Savings.jsx`**: Halaman paling interaktif. Menampilkan ringkasan saldo dan daftar transaksi. Tombol "Tambah" membuka modal yang kompleks.
- **`components/`**: Berisi komponen yang dapat digunakan kembali.
  - **`auth/Login.jsx`**: Form login dengan logika untuk memanggil API, memperbarui state Redux, dan navigasi setelah berhasil.
  - **`savings/SavingsModal.jsx`**: Komponen modal yang kompleks dengan banyak `useEffect`. Ia mengambil daftar anggota & produk, dan secara cerdas **mengisi otomatis produk simpanan** saat anggota dipilih, serta **menghitung periode angsuran berikutnya** dengan memanggil API `check-period`.

## 4. Observasi & Poin Penting

- **Pemisahan Tanggung Jawab**: Proyek ini memiliki pemisahan yang baik antara backend dan frontend.
- **Manajemen State**: Kombinasi Redux untuk state global (autentikasi) dan state lokal untuk data sementara adalah pola yang efisien dan umum.
- **Pengalaman Pengguna (UX)**: UI responsif dengan tema "Sakura Mitra" yang konsisten. Penggunaan *loading state* dan pesan error memberikan umpan balik yang baik kepada pengguna.
- **Skrip Eksternal**: Keberadaan file `.php` menunjukkan adanya kebutuhan integrasi dengan sistem lain atau untuk menyediakan akses data yang disederhanakan tanpa perlu berinteraksi langsung dengan React App atau API yang terproteksi.
- **Inkonsistensi Minor**: Terdapat penggunaan dua pendekatan untuk menangani form: *controlled components* dengan `useState` di beberapa halaman, dan `react-hook-form` di `SavingsModal`. Ini bukan masalah, tetapi sebuah observasi konteks bagi pengembang di masa depan.