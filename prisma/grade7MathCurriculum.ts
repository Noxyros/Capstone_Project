export type MathOptionSeed = { id: string; text: string; isCorrect: boolean }
export type MathQuestionSeed = { id: string; prompt: string; options: MathOptionSeed[] }
export type MathNodeSeed = {
  id: string
  submoduleId: string | null
  title: string
  type: 'LESSON' | 'QUIZ' | 'BOSS' | 'TREASURE'
  content: string
  questions: MathQuestionSeed[]
  rewardCurrency?: 'XP' | 'GEMS'
  rewardAmount?: number
}

type TopicSeed = {
  id: string
  title: string
  content: string
  questions: Array<[string, string, string, string, string]>
}

type DomainSeed = {
  id: string
  title: string
  bossTitle: string
  summary: string
  thinkingLesson: string
  topics: TopicSeed[]
  bossQuestions: Array<[string, string, string, string, string]>
}

function question(
  id: string,
  prompt: string,
  correct: string,
  wrongA: string,
  wrongB: string,
  wrongC: string,
): MathQuestionSeed {
  return {
    id,
    prompt,
    options: [correct, wrongA, wrongB, wrongC].map((text, index) => ({
      id: `${id}-option-${index + 1}`,
      text,
      isCorrect: index === 0,
    })),
  }
}

function quizQuestions(
  prefix: string,
  questions: Array<[string, string, string, string, string]>,
): MathQuestionSeed[] {
  return questions.map(([prompt, correct, wrongA, wrongB, wrongC], index) =>
    question(`${prefix}-q${index + 1}`, prompt, correct, wrongA, wrongB, wrongC))
}

const domains: DomainSeed[] = [
  {
    id: 'number',
    title: 'Bilangan',
    bossTitle: 'Boss Level: Tantangan Bilangan',
    summary: 'Membangun kelancaran bilangan dari garis bilangan dan faktor hingga operasi desimal, pecahan, dan persentase. Siswa menjelaskan strategi, memeriksa kewajaran hasil, serta menggeneralisasi pola numerik.',
    thinkingLesson: `BERPIKIR DAN BEKERJA SECARA MATEMATIS\nMulai dengan specialising: uji ide pada contoh bilangan kecil yang mudah diperiksa. Lalu generalising: tulis apa yang tampaknya selalu benar dan cari alasan yang berlaku untuk semua kasus. Contoh dugaan: jumlah dua bilangan ganjil selalu genap. Tulis bilangan ganjil sebagai 2a + 1 dan 2b + 1; jumlahnya 2(a + b + 1), yang genap. Contoh dan pola membantu menemukan dugaan; bentuk aljabar menjelaskan mengapa dugaan berlaku umum.\n\nSaat membandingkan strategi, gunakan representasi—garis bilangan, tabel, atau perhitungan—dan periksa apakah kesimpulan tetap benar pada bilangan negatif, nol, serta positif.`,
    topics: [
      {
        id: 'integers',
        title: 'Bilangan Bulat dan Garis Bilangan',
        content: `TUJUAN BELAJAR\nMengurutkan dan mengoperasikan bilangan bulat positif, negatif, dan nol, lalu menjelaskan strategi dengan garis bilangan.\n\nGAGASAN UTAMA\nPada garis bilangan, nilai bertambah ke kanan dan berkurang ke kiri. Untuk menghitung -4 + 7, mulai di -4 lalu bergerak tujuh langkah ke kanan; hasilnya 3. Pengurangan dapat dipahami sebagai penambahan lawan: 3 - 8 = 3 + (-8) = -5. Bilangan yang lebih dekat ke kanan selalu lebih besar, sehingga -2 > -6.\n\nCONTOH TERJELAS\nSuhu berubah dari -3°C menjadi 4°C. Perubahannya 4 - (-3) = 7°C. Periksa dengan garis bilangan: jaraknya tujuh satuan.\n\nCOBA DAN JELASKAN\nMulai dari -5, bergerak 8 satuan ke kanan, lalu 2 satuan ke kiri. Tentukan posisi akhir dan jelaskan mengapa urutan gerak itu setara dengan -5 + 8 - 2.`,
        questions: [
          ['Hitung -4 + 9 menggunakan perpindahan pada garis bilangan.', '5', '-13', '-5', '13'],
          ['Urutan dari terkecil ke terbesar yang benar adalah …', '-7, -2, 0, 4', '-2, -7, 0, 4', '4, 0, -2, -7', '-7, 0, -2, 4'],
          ['Suhu -6°C naik 10°C lalu turun 3°C. Berapa suhu akhirnya?', '1°C', '-19°C', '7°C', '-1°C'],
        ],
      },
      {
        id: 'integer-opposites',
        title: 'Lawan Bilangan dan Jarak dari Nol',
        content: `TUJUAN BELAJAR\nMenentukan lawan suatu bilangan bulat dan menjelaskan jaraknya dari nol.\n\nGAGASAN UTAMA\nLawan suatu bilangan terletak pada jarak yang sama dari nol, tetapi di sisi yang berlawanan. Lawan dari 4 adalah -4; lawan dari -7 adalah 7. Lawan dari 0 tetap 0. Nilai mutlak menyatakan jarak dari nol dan tidak negatif, sehingga |-5| = 5 dan |5| = 5.\n\nCONTOH TERJELAS\nSeorang penyelam berada 6 meter di bawah permukaan laut, yaitu -6 m. Lawan posisinya +6 m, enam meter di atas permukaan laut. Jaraknya dari permukaan adalah |-6| = 6 meter. Lawan dan nilai mutlak saling berkaitan, tetapi memiliki arti berbeda.\n\nCOBA DAN JELASKAN\nApa lawan dari -9? Berapa jarak -9 dari nol? Jelaskan mengapa jawabannya tidak sama maknanya.`,
        questions: [
          ['Lawan dari -8 adalah …', '8', '-8', '0', '16'],
          ['Nilai |-12| adalah …', '12', '-12', '0', '24'],
          ['Bilangan yang berjarak 5 dari nol dan berada di kiri nol adalah …', '-5', '5', '-10', '0'],
        ],
      },
      {
        id: 'factors-primes',
        title: 'Faktor, Kelipatan, FPB, KPK, dan Bilangan Prima',
        content: `TUJUAN BELAJAR\nMenentukan faktor dan kelipatan bilangan di bawah 100, mengenali bilangan prima, serta menggunakan faktor prima untuk mencari FPB dan KPK.\n\nGAGASAN UTAMA\nFaktor membagi habis suatu bilangan; kelipatan diperoleh dengan mengalikan bilangan itu dengan 1, 2, 3, dan seterusnya. Bilangan prima memiliki tepat dua faktor positif: 1 dan dirinya sendiri. Bilangan 1 bukan prima. Saringan Eratosthenes: tulis bilangan 2 sampai batas yang dipilih, lalu coret kelipatan 2, 3, 5, dan seterusnya; bilangan yang tidak tercoret adalah prima.\n\nCONTOH TERJELAS\n36 = 2² × 3² dan 48 = 2⁴ × 3. FPB memakai pangkat terkecil faktor yang sama: 2² × 3 = 12. KPK memakai pangkat terbesar: 2⁴ × 3² = 144. Periksa: 12 membagi keduanya, dan 144 adalah kelipatan keduanya.\n\nCOBA DAN JELASKAN\nCari FPB dan KPK dari 18 dan 30. Jelaskan mengapa kelipatan persekutuan terkecil tidak mungkin lebih kecil daripada kedua bilangan tersebut.`,
        questions: [
          ['FPB dari 24 dan 36 adalah …', '12', '6', '72', '18'],
          ['KPK dari 8 dan 12 adalah …', '24', '4', '48', '96'],
          ['Bilangan manakah yang prima?', '29', '1', '21', '39'],
        ],
      },
      {
        id: 'powers-roots',
        title: 'Pangkat dan Akar Kuadrat',
        content: `TUJUAN BELAJAR\nMenghitung kuadrat bilangan sampai 20 × 20 dan mengenali akar kuadrat bilangan kuadrat sempurna.\n\nGAGASAN UTAMA\nKuadrat n adalah n × n, bukan n × 2. Akar kuadrat utama √a adalah bilangan tidak negatif yang kuadratnya a. Pasangan fakta kuadrat membantu memperkirakan akar: karena 8² = 64 dan 9² = 81, maka √70 berada di antara 8 dan 9.\n\nCONTOH TERJELAS\n14² = 14 × 14 = 196, sehingga √196 = 14. Sebaliknya, persamaan x² = 196 memiliki dua solusi, x = 14 atau x = -14; simbol √196 sendiri menyatakan akar utama 14.\n\nCOBA DAN JELASKAN\nApakah 150 merupakan kuadrat sempurna? Gunakan kuadrat terdekat untuk memberi alasan tanpa menebak sembarang angka.`,
        questions: [
          ['Berapakah 17²?', '289', '34', '279', '2890'],
          ['Nilai √225 adalah …', '15', '112,5', '−15 saja', '25'],
          ['Di antara dua bilangan bulat manakah √70 berada?', '8 dan 9', '7 dan 8', '9 dan 10', '35 dan 36'],
        ],
      },
      {
        id: 'place-value-decimals',
        title: 'Nilai Tempat, Perkalian, dan Pembagian Desimal',
        content: `TUJUAN BELAJAR\nMengalikan dan membagi desimal satu atau dua tempat dengan bilangan satu angka serta memeriksa nilai tempat hasilnya.\n\nGAGASAN UTAMA\nNilai tempat menentukan besar angka di belakang koma. Untuk 13,7 × 8, hitung 137 × 8 = 1.096 lalu kembalikan satu tempat desimal: 109,6. Untuk 4,35 ÷ 5, pikirkan 435 perseratus dibagi 5, hasilnya 87 perseratus = 0,87. Perkiraan membantu mendeteksi salah letak koma.\n\nCONTOH TERJELAS\n13,7 × 8 kira-kira 14 × 8 = 112, jadi hasil 109,6 masuk akal. 4,35 ÷ 5 kurang dari 1 karena 4,35 dibagi menjadi lima bagian sama.\n\nCOBA DAN JELASKAN\nHitung 6,24 ÷ 3. Periksa jawaban dengan mengalikan hasilnya dengan 3.`,
        questions: [
          ['Hitung 13,7 × 8.', '109,6', '10,96', '1.096', '21,7'],
          ['Hitung 4,35 ÷ 5.', '0,87', '8,7', '0,087', '2,175'],
          ['Nilai 2,4 × 6 adalah …', '14,4', '144', '1,44', '8,4'],
        ],
      },
      {
        id: 'remainders-rounding',
        title: 'Sisa Pembagian dan Pembulatan Kontekstual',
        content: `TUJUAN BELAJAR\nMenyatakan sisa pembagian sebagai pecahan dan memilih pembulatan yang sesuai dengan konteks.\n\nGAGASAN UTAMA\n157 ÷ 25 = 6 sisa 7, sebab 25 × 6 = 150 dan 157 − 150 = 7. Sebagai bilangan campuran hasilnya 6 7/25. Dalam konteks, 23 siswa yang naik kendaraan berkapasitas 8 orang membutuhkan 23 ÷ 8 = 2 sisa 7 kendaraan, jadi harus dibulatkan ke atas menjadi 3 kendaraan. Untuk panjang potongan yang dapat dibuat dari bahan tetap, mungkin justru perlu membulatkan ke bawah.\n\nCOBA DAN JELASKAN\nSebanyak 53 botol dikemas dalam kotak berisi 12. Berapa kotak penuh dan berapa kotak yang harus disediakan agar semua botol terbawa? Mengapa jawaban konteksnya berbeda dari 53 ÷ 12 = 4 sisa 5?`,
        questions: [
          ['Nyatakan 157 ÷ 25 sebagai bilangan campuran.', '6 7/25', '6 25/7', '7 6/25', '5 32/25'],
          ['Mobil memuat 8 penumpang. Minimum mobil untuk 23 orang adalah …', '3', '2', '2 sisa 7', '4'],
          ['Panjang pita 10 m dipotong menjadi bagian utuh 3 m. Banyak potongan penuh adalah …', '3', '4', '3,33', '7'],
        ],
      },
      {
        id: 'fractions-decimals-percentages',
        title: 'Pecahan, Desimal, dan Persentase',
        content: `TUJUAN BELAJAR\nMenyederhanakan dan membandingkan pecahan, mengubah pecahan campuran, pecahan, desimal, dan persentase, serta menyelesaikan masalah perubahan persentase.\n\nGAGASAN UTAMA\nPecahan senilai diperoleh dengan mengalikan atau membagi pembilang dan penyebut dengan bilangan bukan nol yang sama. 1 3/4 = 7/4. Untuk mengubah pecahan ke desimal, bagi pembilang dengan penyebut; untuk persentase kalikan desimal dengan 100%. Persentase kenaikan dihitung terhadap nilai awal, bukan nilai akhir.\n\nCONTOH TERJELAS\n25% dari 240 = 0,25 × 240 = 60. Harga Rp80.000 naik 10% menjadi Rp88.000; turun 10% dari harga baru menjadi Rp79.200, bukan kembali ke Rp80.000 karena dasar persentasenya berubah.\n\nCOBA DAN JELASKAN\nUbah 3/8 menjadi desimal dan persentase. Lalu hitung harga Rp120.000 setelah diskon 15%, tunjukkan dua cara untuk memeriksa hasilnya.`,
        questions: [
          ['Bentuk paling sederhana dari 18/24 adalah …', '3/4', '9/12', '2/3', '4/3'],
          ['Bentuk desimal dan persentase dari 3/8 adalah …', '0,375 dan 37,5%', '0,38 dan 38%', '0,35 dan 35%', '3,8 dan 380%'],
          ['Harga Rp80.000 naik 10%. Harga barunya adalah …', 'Rp88.000', 'Rp80.010', 'Rp72.000', 'Rp90.000'],
        ],
      },
    ],
    bossQuestions: [
      ['Suhu -4°C naik 9°C. Berapa suhu akhirnya?', '5°C', '-13°C', '13°C', '-5°C'],
      ['FPB dari 28 dan 42 adalah …', '14', '7', '84', '6'],
      ['Hitung 2,5 × 6.', '15', '1,5', '150', '8,5'],
      ['Bentuk pecahan paling sederhana dari 45% adalah …', '9/20', '45/10', '4/5', '1/45'],
      ['Sebuah siswa menyatakan √81 = ±9. Bagaimana mengklasifikasikan dan memperbaiki pernyataan itu?', '√81 = 9; persamaan x² = 81 memiliki solusi ±9', '√81 = −9 saja', '√81 = ±81', 'Akar kuadrat tidak dapat dihitung'],
    ],
  },
  {
    id: 'algebra',
    title: 'Aljabar',
    bossTitle: 'Boss Level: Misi Aljabar',
    summary: 'Bergerak dari penggunaan simbol dan generalisasi pola menuju persamaan serta representasi koordinat. Siswa menguji dugaan dengan contoh dan memeriksa solusi melalui substitusi.',
    thinkingLesson: `BERPIKIR DAN BEKERJA SECARA MATEMATIS\nSpecialising berarti menguji beberapa nilai tertentu; generalising berarti menyatakan pola yang berlaku untuk semua nilai. Untuk barisan 3, 7, 11, 15, uji beda antarsuku, lalu duga suku ke-n. Dugaan harus diperiksa pada beberapa posisi; pembuktian menjelaskan strukturnya, bukan sekadar mengulang contoh.\n\nConjecturing and convincing: nyatakan dugaan dengan jelas, berikan alasan matematis, dan cari contoh tandingan. Characterising and classifying: kelompokkan ekspresi menurut struktur, misalnya suku sejenis memiliki variabel dan pangkat yang sama. Substitusi positif dan negatif adalah cara menguji apakah suatu rumus konsisten dengan contoh.`,
    topics: [
      {
        id: 'expressions-formulae',
        title: 'Ekspresi dan Rumus Aljabar',
        content: `TUJUAN BELAJAR\nMenggunakan variabel untuk mewakili bilangan, menulis dan menyederhanakan ekspresi, serta melakukan substitusi bilangan positif dan negatif.\n\nGAGASAN UTAMA\nVariabel adalah simbol untuk nilai yang dapat berubah atau belum diketahui. Tiga kali x ditulis 3x. Suku sejenis memiliki bagian variabel dan pangkat yang sama: 4x + 3x = 7x, tetapi 4x + 3y tidak dapat digabung. Substitusi berarti mengganti variabel dengan nilainya, kemudian mengikuti urutan operasi.\n\nCONTOH TERJELAS\nUntuk P = 2l + 2w, ketika l = 5 dan w = 3, P = 2(5) + 2(3) = 16. Jika x = -2, maka 3x + 5 = 3(-2) + 5 = -1. Tanda negatif termasuk dalam nilai pengganti.\n\nCOBA DAN JELASKAN\nSederhanakan 5a + 2b - 3a + b. Hitung hasilnya ketika a = -1 dan b = 4.`,
        questions: [
          ['Sederhanakan 7x − 3x + 2.', '4x + 2', '4x', '10x + 2', '4x − 2'],
          ['Nilai 2a + 3 ketika a = −4 adalah …', '−5', '11', '5', '−11'],
          ['Manakah pasangan suku sejenis?', '3m dan −8m', '3m dan 3n', 'm dan m²', '4 dan 4x'],
        ],
      },
      {
        id: 'linear-equations',
        title: 'Persamaan Linear Satu Variabel',
        content: `TUJUAN BELAJAR\nMembentuk dan menyelesaikan persamaan linear satu variabel, lalu memeriksa solusi dengan substitusi balik.\n\nGAGASAN UTAMA\nPersamaan menyatakan dua ekspresi bernilai sama. Operasi yang sama pada kedua sisi mempertahankan kesetaraan. Untuk 2x + 5 = 13, kurangi 5 pada kedua sisi lalu bagi 2: x = 4. Pemeriksaan: 2(4) + 5 = 13.\n\nMEMBENTUK MODEL\n“Tiga lebih dari dua kali sebuah bilangan adalah 17” menjadi 2x + 3 = 17. Kata-kata perlu diterjemahkan dengan cermat; “dua kali jumlah bilangan dan tiga” berbeda menjadi 2(x + 3).\n\nCOBA DAN JELASKAN\nSelesaikan 4x - 7 = 13, substitusikan kembali, dan jelaskan mengapa mengurangi 7 pada kedua sisi bukan langkah yang setara.`,
        questions: [
          ['Selesaikan 2x + 5 = 13.', 'x = 4', 'x = 9', 'x = 3', 'x = 18'],
          ['“Lima kurang dari tiga kali x sama dengan 16” ditulis …', '3x − 5 = 16', '3(x − 5) = 16', '5 − 3x = 16', '3x + 5 = 16'],
          ['Pemeriksaan yang benar untuk x = 6 pada x/2 + 1 = 4 adalah …', '6/2 + 1 = 4', '6/2 − 1 = 4', '2/6 + 1 = 4', '6 + 2 = 4'],
        ],
      },
      {
        id: 'sequences-and-graphs',
        title: 'Barisan, Koordinat, dan Grafik',
        content: `TUJUAN BELAJAR\nMenemukan aturan suku-ke-suku dan posisi-ke-suku serta membaca atau menggambar garis horizontal, vertikal, dan fungsi linear sederhana pada empat kuadran.\n\nGAGASAN UTAMA\nPada barisan 5, 8, 11, 14, aturan suku-ke-suku adalah tambah 3; suku ke-n ialah 3n + 2. Jangan menganggap pola terbatas membuktikan aturan untuk semua suku: uji beberapa kasus dan jelaskan struktur yang berulang. Titik (x,y) dibaca mendatar lalu tegak. Kuadran I (+,+), II (-,+), III (-,-), IV (+,-).\n\nGRAFIK\nPada y = mx + c, c adalah titik potong sumbu-y dan m menunjukkan perubahan y untuk setiap kenaikan satu satuan x. Grafik y = 2x + 1 melalui (0,1), (1,3), dan (-1,-1). y = 4 adalah garis horizontal; x = -2 garis vertikal.\n\nCOBA DAN JELASKAN\nLanjutkan 2, 6, 10, 14. Usulkan aturan suku ke-n, uji pada dua suku, lalu tentukan kuadran titik (-3, 2).`,
        questions: [
          ['Aturan suku-ke-suku dari 4, 9, 14, 19 adalah …', 'tambah 5', 'kali 5', 'tambah 4', 'tambah 9'],
          ['Titik (-3, 2) terletak di kuadran …', 'II', 'I', 'III', 'IV'],
          ['Jika y = 2x + 1, nilai y saat x = 3 adalah …', '7', '5', '6', '8'],
        ],
      },
    ],
    bossQuestions: [
      ['Sederhanakan 3a + 2b − a + 5b.', '2a + 7b', '10ab', '2a + 3b', '4a + 7b'],
      ['Selesaikan 3x − 4 = 11 dan periksa dengan substitusi.', 'x = 5', 'x = 7', 'x = 15', 'x = −5'],
      ['Barisan 7, 11, 15, 19 mengikuti aturan suku-ke-suku …', 'tambah 4', 'kali 4', 'tambah 7', 'kali 2'],
      ['Pada y = 3x − 2, titik potong sumbu-y adalah …', '(0, −2)', '(−2, 0)', '(0, 3)', '(3, 0)'],
      ['Dugaan “setiap kenaikan x satu pada y = 2x + 1 menaikkan y dua” dapat dibuktikan dengan …', 'membandingkan y(x+1) − y(x) = 2', 'menguji hanya x = 0', 'mengubah x menjadi 2x', 'menggambar satu titik saja'],
    ],
  },
  {
    id: 'geometry',
    title: 'Geometri dan Pengukuran',
    bossTitle: 'Boss Level: Penjelajah Geometri',
    summary: 'Mengembangkan penalaran ruang dan bentuk: hubungan sudut, sifat bentuk dua dan tiga dimensi, pengukuran, dan transformasi. Siswa mengklasifikasikan bangun berdasarkan sifat, bukan hanya tampilannya.',
    thinkingLesson: `BERPIKIR DAN BEKERJA SECARA MATEMATIS\nCharacterising and classifying: kelompokkan bangun menggunakan sifat yang dapat diperiksa—jumlah sisi, sisi sejajar, panjang sisi, dan besar sudut—bukan warna atau arah gambar. Satu bangun dapat berada di beberapa kelompok sekaligus; persegi juga persegi panjang karena memenuhi seluruh sifatnya.\n\nConjecturing and convincing: buat dugaan dari beberapa gambar, lalu cari alasan yang membuktikannya untuk setiap bangun dalam kelompok. Specialising membantu memeriksa contoh tertentu; generalising menuntut penjelasan yang berlaku untuk semua posisi atau ukuran. Pada transformasi, gunakan aturan koordinat untuk memeriksa dugaan tentang panjang dan sudut.`,
    topics: [
      {
        id: 'angles-lines',
        title: 'Sudut dan Garis',
        content: `TUJUAN BELAJAR\nMengidentifikasi sudut lancip, tumpul, refleks, sudut pada garis lurus dan satu titik serta menggunakan hubungan sudut pada garis sejajar dan segitiga.\n\nGAGASAN UTAMA\nLancip < 90°, siku-siku = 90°, tumpul antara 90° dan 180°, lurus = 180°, refleks antara 180° dan 360°, satu putaran = 360°. Sudut bertolak belakang sama besar. Pada garis sejajar, sudut sehadap dan dalam berseberangan sama besar. Sudut berpelurus berjumlah 180°, dan jumlah sudut segitiga 180°.\n\nCONTOH TERJELAS\nJika dua garis berpotongan dan satu sudut 68°, sudut di sebelahnya 112° karena membentuk garis lurus; sudut yang bertolak belakang dengannya 68°.\n\nCOBA DAN JELASKAN\nSegitiga memiliki sudut 47° dan 63°. Tentukan sudut ketiga. Sebutkan sifat yang membenarkan langkahmu.`,
        questions: [
          ['Sudut 125° termasuk …', 'tumpul', 'lancip', 'refleks', 'siku-siku'],
          ['Sudut bertolak belakang dengan 68° adalah …', '68°', '112°', '180°', '292°'],
          ['Sudut segitiga 47° dan 63°. Sudut ketiga adalah …', '70°', '80°', '110°', '130°'],
        ],
      },
      {
        id: 'shapes-reasoning',
        title: 'Poligon, Lingkaran, Segi Empat, dan Jaring-Jaring',
        content: `TUJUAN BELAJAR\nMengklasifikasikan poligon, lingkaran, dan segi empat berdasarkan sifat serta mengenali jaring-jaring kubus, balok, dan prisma.\n\nKLASIFIKASI BERDASARKAN SIFAT\nPoligon adalah bangun tertutup dengan sisi lurus. Segi empat memiliki empat sisi; jajargenjang memiliki dua pasang sisi berhadapan sejajar, persegi panjang juga semua sudutnya siku-siku, belah ketupat semua sisinya sama panjang, persegi memenuhi keduanya. Trapesium memiliki sepasang sisi sejajar (konvensi yang digunakan di sini). Layang-layang memiliki dua pasang sisi berdekatan yang sama panjang. Lingkaran memiliki pusat, jari-jari, diameter, dan keliling.\n\nBANGUN RUANG\nJaring-jaring harus melipat tanpa tumpang tindih: kubus memiliki enam persegi kongruen, balok enam persegi panjang, prisma memiliki dua alas poligon kongruen dan sisi tegak berbentuk persegi panjang.\n\nCOBA DAN JELASKAN\nMengapa setiap persegi adalah persegi panjang dan belah ketupat, tetapi tidak setiap persegi panjang adalah persegi? Gunakan sifat sisi dan sudut sebagai bukti.`,
        questions: [
          ['Bangun segi empat dengan dua pasang sisi berhadapan sejajar adalah …', 'jajargenjang', 'layang-layang', 'segitiga', 'lingkaran'],
          ['Jaring-jaring kubus terdiri dari …', 'enam persegi', 'empat persegi dan dua lingkaran', 'enam segitiga', 'dua persegi panjang'],
          ['Diameter lingkaran dengan jari-jari 7 cm adalah …', '14 cm', '7 cm', '21 cm', '49 cm'],
        ],
      },
      {
        id: 'measurement',
        title: 'Satuan, Keliling, Luas, dan Volume',
        content: `TUJUAN BELAJAR\nMengonversi satuan metrik panjang, massa, dan kapasitas; menghitung keliling dan luas bangun datar serta volume kubus dan balok.\n\nSATUAN DAN RUMUS\n1 m = 100 cm; 1 km = 1.000 m; 1 kg = 1.000 g; 1 L = 1.000 mL. Keliling adalah panjang batas. Luas persegi panjang = panjang × lebar; luas segitiga = ½ × alas × tinggi. Untuk bentuk gabungan, pecah menjadi bentuk sederhana tanpa menghitung area tumpang tindih dua kali. Volume balok = p × l × t; kubus = s³. Satuan volume berbentuk kubik, misalnya cm³.\n\nCONTOH TERJELAS\nBalok 5 cm × 3 cm × 2 cm memiliki volume 30 cm³. Persegi panjang 8 cm × 5 cm memiliki keliling 26 cm, bukan 40 cm²; keliling dan luas adalah besaran berbeda.\n\nCOBA DAN JELASKAN\nSebuah segitiga alas 10 cm dan tinggi 6 cm menempel pada persegi panjang 10 cm × 4 cm tanpa bertumpang tindih. Tentukan luas gabungannya dan satuannya.`,
        questions: [
          ['2,5 kg sama dengan …', '2.500 g', '250 g', '25.000 g', '0,25 g'],
          ['Luas segitiga dengan alas 8 cm dan tinggi 5 cm adalah …', '20 cm²', '40 cm²', '13 cm²', '26 cm²'],
          ['Volume balok 4 cm × 3 cm × 5 cm adalah …', '60 cm³', '12 cm³', '47 cm³', '60 cm²'],
        ],
      },
      {
        id: 'transformations',
        title: 'Refleksi, Rotasi, dan Translasi',
        content: `TUJUAN BELAJAR\nMentransformasikan titik dan bangun melalui refleksi pada garis vertikal, horizontal, atau diagonal; rotasi 90° atau 180°; dan translasi dengan vektor.\n\nATURAN KOORDINAT\nRefleksi pada sumbu-y: (x,y) → (-x,y). Pada sumbu-x: (x,y) → (x,-y). Refleksi pada y=x: (x,y) → (y,x). Rotasi 90° berlawanan arah jarum jam berpusat di O: (x,y) → (-y,x); rotasi 180°: (x,y) → (-x,-y). Translasi oleh vektor (a,b): (x,y) → (x+a,y+b).\n\nPENALARAN\nRefleksi, rotasi, dan translasi mempertahankan panjang sisi dan besar sudut; bentuk dan ukuran tetap sama, orientasi atau posisi dapat berubah. Sebutkan garis cermin atau pusat dan arah rotasi agar transformasi dapat direproduksi.\n\nCOBA DAN JELASKAN\nTitik (2,-3) ditranslasikan oleh (-4,5). Tentukan bayangannya dan jelaskan perubahan pada masing-masing koordinat.`,
        questions: [
          ['Refleksi titik (3, −2) pada sumbu-y menghasilkan …', '(−3, −2)', '(3, 2)', '(−3, 2)', '(2, −3)'],
          ['Translasi (1, 4) oleh vektor (−3, 2) menghasilkan …', '(−2, 6)', '(4, 2)', '(−3, 8)', '(2, −6)'],
          ['Rotasi 180° terhadap titik pusat O memetakan (a,b) menjadi …', '(−a, −b)', '(a, −b)', '(−a, b)', '(b, a)'],
        ],
      },
    ],
    bossQuestions: [
      ['Dua sudut segitiga 35° dan 85°. Sudut ketiga adalah …', '60°', '95°', '120°', '50°'],
      ['Bangun dengan dua pasang sisi berhadapan sejajar dan semua sudut siku-siku adalah …', 'persegi panjang', 'layang-layang', 'trapesium tanpa sisi sejajar', 'segitiga'],
      ['Volume kubus dengan sisi 4 cm adalah …', '64 cm³', '16 cm³', '48 cm³', '64 cm²'],
      ['Refleksi titik (−2,5) pada garis y=x adalah …', '(5, −2)', '(−2, −5)', '(2, 5)', '(−5, 2)'],
      ['Siswa mengelompokkan persegi sebagai persegi panjang. Bukti sifat yang tepat adalah …', 'keempat sudutnya siku-siku dan sisi berhadapan sejajar', 'semua sisinya lengkung', 'hanya memiliki satu sisi sejajar', 'diagonalnya selalu berbeda panjang'],
    ],
  },
  {
    id: 'statistics-probability',
    title: 'Statistika dan Peluang',
    bossTitle: 'Boss Level: Detektif Data dan Peluang',
    summary: 'Mengubah pertanyaan menjadi data yang dapat dikumpulkan, memilih representasi yang tepat, merangkum pusat dan sebaran data, lalu mengukur peluang dan membandingkan prediksi dengan hasil eksperimen.',
    thinkingLesson: `BERPIKIR DAN BEKERJA SECARA MATEMATIS\nConjecturing and convincing: buat prediksi sebelum mengumpulkan data atau mengulang percobaan, lalu dukung kesimpulan dengan bukti. Pisahkan apa yang ditunjukkan data dari apa yang hanya kamu duga. Periksa ukuran sampel, cara pemilihan responden, dan kemungkinan bias.\n\nSpecialising and generalising: gunakan contoh kecil untuk memahami mean atau peluang, kemudian jelaskan apa yang mungkin berubah pada sampel lebih besar dan apa yang tetap. Characterising and classifying: tentukan apakah data berupa kategori atau nilai numerik, serta apakah mean, median, modus, tabel, atau grafik paling sesuai dengan pertanyaan.`,
    topics: [
      {
        id: 'data-collection-presentation',
        title: 'Pengumpulan dan Penyajian Data',
        content: `TUJUAN BELAJAR\nMerencanakan pengumpulan data dengan tally sheet atau kuesioner serta menyajikan frekuensi melalui tabel, diagram batang, diagram lingkaran, dan grafik garis.\n\nRENCANA DATA\nMulai dengan pertanyaan yang jelas dan populasi sasaran. Pertanyaan kuesioner sebaiknya netral, tidak menggiring jawaban, serta menyediakan pilihan yang sesuai. Tally dikelompokkan per lima agar mudah dihitung; tabel frekuensi mencatat setiap kategori dan jumlahnya.\n\nPILIH REPRESENTASI\nDiagram batang membandingkan kategori; tinggi batang sesuai frekuensi dan batang terpisah. Diagram lingkaran menunjukkan bagian dari keseluruhan: sudut sektor = frekuensi/total × 360°. Grafik garis cocok untuk perubahan berurutan terhadap waktu. Label, skala, satuan, dan judul harus jelas.\n\nCOBA DAN JELASKAN\nSebuah survei bertanya “Kamu setuju bahwa olahraga terbaik itu sepak bola, kan?” Jelaskan bias pertanyaannya dan tulis versi yang lebih netral.`,
        questions: [
          ['Grafik yang paling sesuai untuk menunjukkan suhu harian selama seminggu adalah …', 'grafik garis', 'diagram lingkaran', 'diagram batang tanpa urutan', 'tally tanpa label'],
          ['Dari 20 siswa, 5 memilih membaca. Sudut sektor pada diagram lingkaran adalah …', '90°', '5°', '72°', '180°'],
          ['Pertanyaan survei yang netral adalah …', 'Berapa menit kamu membaca kemarin?', 'Kamu suka membaca buku bagus, bukan?', 'Mengapa membaca lebih baik dari gim?', 'Setuju semua siswa harus membaca?'],
        ],
      },
      {
        id: 'statistical-measures',
        title: 'Mean, Median, Modus, dan Jangkauan',
        content: `TUJUAN BELAJAR\nMenghitung dan menafsirkan mean, median, modus, dan range serta memilih ukuran pemusatan yang paling mewakili data.\n\nEMPAT UKURAN\nMean = jumlah semua nilai ÷ banyaknya nilai. Median adalah nilai tengah setelah data diurutkan (atau rata-rata dua nilai tengah jika banyak data genap). Modus adalah nilai yang paling sering muncul; data dapat memiliki lebih dari satu modus atau tidak memiliki modus. Range = nilai terbesar − nilai terkecil.\n\nMEMILIH UKURAN\nMean menggunakan setiap nilai tetapi terpengaruh pencilan. Median lebih tahan terhadap pencilan; modus cocok untuk kategori atau nilai paling umum. Pilihan terbaik bergantung pada bentuk dan tujuan data, bukan hanya satu rumus.\n\nCONTOH\nUntuk 2, 3, 3, 4, 18: mean = 6, median = 3, modus = 3, range = 16. Nilai 18 menaikkan mean; median lebih menggambarkan hasil tipikal pada data ini.\n\nCOBA DAN JELASKAN\nTambahkan satu nilai pada 2, 4, 6 sehingga mean menjadi 5. Jelaskan mengapa nilai yang kamu pilih memenuhi syarat.`,
        questions: [
          ['Mean dari 2, 4, 6 adalah …', '4', '3', '6', '12'],
          ['Median dari 1, 3, 8, 10 adalah …', '5,5', '3', '8', '6'],
          ['Ukuran yang paling tahan terhadap satu pencilan sangat besar adalah …', 'median', 'mean', 'range', 'jumlah data'],
        ],
      },
      {
        id: 'probability',
        title: 'Skala Peluang dan Peluang Teoretis',
        content: `TUJUAN BELAJAR\nMenempatkan kejadian pada skala peluang dari 0 sampai 1 dan menghitung peluang teoretis dalam satu percobaan koin atau dadu.\n\nGAGASAN UTAMA\nPeluang 0 berarti mustahil; 1 berarti pasti. Jika semua hasil sama mungkin, peluang = banyak hasil yang diinginkan ÷ banyak semua hasil. Untuk dadu adil, P(mendapat angka genap) = 3/6 = 1/2. Peluang komplemen suatu kejadian = 1 − peluang kejadian itu.\n\nTEORI DAN EKSPERIMEN\nFrekuensi relatif dari percobaan dapat berbeda dari peluang teoretis, terutama pada jumlah percobaan kecil. Dengan semakin banyak percobaan yang adil, frekuensi relatif biasanya makin dekat ke peluang teoretis, tetapi tidak dijamin sama persis pada setiap sampel.\n\nCOBA DAN JELASKAN\nLempar koin 10 kali dan 100 kali. Buat dugaan tentang frekuensi relatif sisi gambar, lalu jelaskan mengapa kedua hasil tidak harus tepat 1/2.`,
        questions: [
          ['Peluang mendapat angka lebih dari 4 pada dadu adil adalah …', '2/6 = 1/3', '4/6 = 2/3', '1/6', '5/6'],
          ['Peluang kejadian mustahil adalah …', '0', '1', '1/2', 'tak terhingga'],
          ['Pada satu lemparan dadu, peluang tidak mendapat angka 6 adalah …', '5/6', '1/6', '1/2', '6/6'],
        ],
      },
    ],
    bossQuestions: [
      ['Sektor 25% dari diagram lingkaran memiliki sudut …', '90°', '25°', '180°', '45°'],
      ['Mean data 3, 5, 7, 9 adalah …', '6', '5', '7', '24'],
      ['Peluang mendapat sisi gambar pada satu koin adil adalah …', '1/2', '1/4', '1', '0'],
      ['Urutan nilai 2, 5, 5, 8 memiliki median …', '5', '2', '5,5', '8'],
      ['Dugaan bahwa hasil percobaan koin akan mendekati peluang teoretis diuji paling baik dengan …', 'mengulang banyak percobaan dan membandingkan frekuensi relatif', 'melakukan satu lemparan saja', 'mengubah hasil yang tidak sesuai', 'menganggap setiap sampel harus separuh tepat'],
    ],
  },
]

const legacyNodeIds: Record<string, string> = {
  'number:integers:lesson': 'g7-math-integers-context',
  'number:integers:quiz': 'g7-math-integers-signs-quiz',
  'number:integer-opposites:lesson': 'g7-math-integers-opposites',
  'number:factors-primes:lesson': 'g7-math-integers-number-line-lesson',
  'number:factors-primes:quiz': 'g7-math-integers-line-quiz',
  'number:powers-roots:lesson': 'g7-math-integers-compare',
  'number:place-value-decimals:lesson': 'g7-math-integers-decimals-lesson',
  'number:place-value-decimals:quiz': 'g7-math-integers-decimals-quiz',
  'number:remainders-rounding:lesson': 'g7-math-integers-rounding-lesson',
  'number:remainders-rounding:quiz': 'g7-math-integers-rounding-quiz',
  'number:fractions-decimals-percentages:lesson': 'g7-math-integers-fractions-lesson',
  'number:fractions-decimals-percentages:quiz': 'g7-math-integers-fractions-quiz',
}

export function buildGrade7MathDomains(randomInt: (maximum: number) => number): Array<{
  id: string
  title: string
  summary: string
  submodules: Array<{ id: string; title: string; order: number; summary: string }>
  nodes: MathNodeSeed[]
}> {
  return domains.map((domain) => {
    const submodules = domain.topics.map((topic, index) => ({
      id: `g7-math-${domain.id}-${topic.id}`,
      title: topic.title,
      order: index + 1,
      summary: topic.content.split('\n\n').slice(0, 2).join('\n\n'),
    }))
    const blocks: MathNodeSeed[][] = domain.topics.map((topic): MathNodeSeed[] => {
      const lessonId = legacyNodeIds[`${domain.id}:${topic.id}:lesson`] ?? `g7-math-${domain.id}-${topic.id}-lesson`
      const quizId = legacyNodeIds[`${domain.id}:${topic.id}:quiz`] ?? `g7-math-${domain.id}-${topic.id}-quiz`
      const submoduleId = `g7-math-${domain.id}-${topic.id}`
      return [
        {
          id: lessonId,
          submoduleId,
          title: topic.title,
          type: 'LESSON' as const,
          content: topic.content,
          questions: [],
        },
        {
          id: quizId,
          submoduleId,
          title: `${topic.title}: Latihan`,
          type: 'QUIZ' as const,
          content: '',
          questions: quizQuestions(quizId, topic.questions),
        },
      ]
    })
    const treasurePosition = randomInt(blocks.length) + 1
    const treasureId = domain.id === 'number'
      ? 'g7-math-integers-treasure'
      : `g7-math-${domain.id}-treasure`
    const treasureSubmoduleId = `g7-math-${domain.id}-${domain.topics[treasurePosition - 1]!.id}`
    blocks.splice(treasurePosition, 0, [{
      id: treasureId,
      submoduleId: treasureSubmoduleId,
      title: '',
      type: 'TREASURE' as const,
      content: '',
      questions: [],
      rewardCurrency: randomInt(2) === 0 ? 'XP' as const : 'GEMS' as const,
      rewardAmount: 10 + randomInt(90),
    }])
    const bossId = domain.id === 'number'
      ? 'g7-math-integers-final-quiz'
      : `g7-math-${domain.id}-boss`
    return {
      id: domain.id === 'number' ? 'g7-math-integers-number-line' : `g7-math-domain-${domain.id}`,
      title: domain.title,
      summary: domain.summary,
      submodules,
      nodes: [
        {
          id: `g7-math-${domain.id}-thinking-practices`,
          submoduleId: submodules[0]!.id,
          title: 'Berpikir dan Bekerja Secara Matematis',
          type: 'LESSON',
          content: domain.thinkingLesson,
          questions: [],
        },
        ...blocks.flat(),
        {
          id: bossId,
          submoduleId: submodules.at(-1)!.id,
          title: domain.bossTitle,
          type: 'BOSS' as const,
          content: '',
          questions: quizQuestions(`${bossId}-question`, domain.bossQuestions),
        },
      ],
    }
  })
}
