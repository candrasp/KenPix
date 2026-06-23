Saya akan membuat aplikasi converter image sederhana dengan nama Kenpix, menggunakan tauri v2 dengan bahasa pemrograman rust dan frontend nya menggunakan html, tailwind css, typescript. 
Berikut adalah fitur yang harus ada pada aplikasi ini:


Desain Tampilan: 

desain tampilan adalah dark desain dan menggunakan tailwind css v4 dan typescript, font yang di gunakan adalah jakarta dari google font dan menggunakan lucide-react untuk icon icon nya.

1. halaman awal adalah halaman untuk convert dengan desain berikut

multiple files support
drag drop file 
kemudian bawahnya ada pilihan memformat menjadi apa (png, jpg, jpeg, webp, avif)
kemudian ada tombol "start convert"  

ketika tombol di klik maka akan ada progres bar dan menunjukkan persentase

setelah proses selesai maka akan menampilkan summari file beserta ukurannya.

kemudian di bawahnya ada tombol convert lagi untuk me refresh halaman  agar bisa di gunakan untuk convert ulang, dan pada saat menekan tombol ini maka proses convert sebelumnya harus di hapus.

2. halaman kedua adalah halaman settings, di halaman ini ada pilihan untuk 

- lokasi penyimpanan file (folder) secara default C:\Users\Default\Pictures dan user bisa memilih folder lain sesuai keinginan.
logika penyimpanan folder ini adalah setiap format akan membuat sub folder misalnya jika user memilih folder C:\Users\Default\Pictures maka akan tersimpan di C:\Users\Default\Pictures\png, C:\Users\Default\Pictures\jpg, C:\Users\Default\Pictures\jpeg, C:\Users\Default\Pictures\webp, C:\Users\Default\Pictures\avif

sub folder ini akan otomatis di buat ketika user memilih format tertentu pada saat akan convert file.

- Update version, aplikasi ini pertama kali di release adalah versi 1.0.0 dan fitur nya hanya convert file dari png, jpg, jpeg, webp, avif ke png, jpg, jpeg, webp, avif


---

Alat & Library Rust untuk Core Kompresi

Untuk PNG (Kloning TinyPNG)
imagequant (Crate): Ini adalah engine resmi Rust di balik pngquant (teknologi yang sama dengan TinyPNG). Library ini akan melakukan lossy quantization pada gambar PNG Anda di tingkat low-level, menghasilkan ukuran file yang sangat kecil secara instan.
oxipng (Crate): Sering digunakan setelah imagequant untuk melakukan optimasi lossless tambahan guna membuang sisa bytes yang tidak diperlukan.

Untuk WebP & AVIF
image (Crate): Library manipulasi gambar paling standar di Rust. Bisa digunakan untuk membaca berbagai format dan menyimpannya kembali dalam bentuk WebP dengan menentukan tingkat kualitas (misal: 80%).
ravif atau libavif-sys (Crate): Jika Anda ingin aplikasi desktop Anda bisa mengekspor ke format AVIF masa kini dengan kompresi maksimal.
