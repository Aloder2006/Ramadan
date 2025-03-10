// Convert number to Arabic numerals
function toArabicNumerals(number) {
    const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    return number.toString().split('').map(digit => arabicDigits[digit]).join('');
}

// Convert 24-hour time to 12-hour format with Arabic AM/PM
function to12HourFormat(hours, minutes) {
    const period = hours >= 12 ? "م" : "ص";
    const adjustedHours = hours % 12 || 12;
    return `${toArabicNumerals(adjustedHours)}:${toArabicNumerals(minutes.toString().padStart(2, '0'))} ${period}`;
}

const darkColors = ['#1a1433', '#0d1b1b', '#071f29', '#261919', '#1f0033'];

function setDynamicBackground() {
    const hour = new Date().getHours();
    let colors;
    if (hour < 6) colors = ['#1a1433', '#0d1b1b']; // فجر
    else if (hour < 12) colors = ['#071f29', '#261919']; // صباح
    else if (hour < 18) colors = ['#261919', '#1f0033']; // ظهر وعصر
    else colors = ['#1f0033', '#1a1433']; // مغرب وعشاء
    document.body.style.background = `linear-gradient(135deg, ${colors[0]}, ${colors[1]})`;
}

function updateVisitorCount() {
    fetch('https://api.countapi.xyz/hit/aladhan-o.vercel.app/count')
        .then(response => response.json())
        .then(data => {
            document.getElementById("visitor-count").innerText = toArabicNumerals(data.value);
        })
        .catch(error => {
            console.error("Error fetching visitor count:", error);
            document.getElementById("visitor-count").innerText = "خطأ";
        });
}

function getLocation() {
    const loadingModal = new bootstrap.Modal(document.getElementById("loadingModal"));
    loadingModal.show();
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            fetchPrayerAndRamadan,
            showError,
            { timeout: 30000, maximumAge: 0, enableHighAccuracy: true }
        );
    } else {
        document.getElementById("countdown").innerText = "المتصفح لا يدعم تحديد الموقع.";
        loadingModal.hide();
        showPersistentModal();
    }
    setDynamicBackground();
    updateVisitorCount(); // Update visitor count using CountAPI
}

async function getLocationName(lat, lon) {
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1&accept-language=ar`, { timeout: 5000 });
        if (!response.ok) throw new Error(`Nominatim API error: ${response.status}`);
        const data = await response.json();
        const city = data.address.city || data.address.town || data.address.village || "غير معروف";
        const country = data.address.country || "غير معروف";
        return `${city}، ${country}`;
    } catch (error) {
        console.error("Error fetching location name:", error);
        return "موقع غير معروف";
    }
}

async function fetchRandomVerse() {
    try {
        const response = await fetch('https://api.alquran.cloud/v1/ayah/' + Math.floor(Math.random() * 6236));
        if (!response.ok) throw new Error('Quran API error');
        const data = await response.json();
        document.getElementById("quran-verse").innerText = data.data.text;
        document.getElementById("quran-info").innerText = `${data.data.surah.name} - آية ${toArabicNumerals(data.data.numberInSurah)}`;
    } catch (error) {
        console.error("Error fetching Quran verse:", error);
        document.getElementById("quran-verse").innerText = "خطأ في جلب الآية.";
        document.getElementById("quran-info").innerText = "";
    }
}

async function fetchPrayerAndRamadan(position) {
    const lat = position.coords.latitude;
    const lon = position.coords.longitude;
    const date = new Date();
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const dateStr = `${day}-${month}-${year}`;

    const locationName = await getLocationName(lat, lon);
    document.getElementById("location").innerText = `الموقع: ${locationName}`;

    const cacheKey = `prayerTimes_${dateStr}_${lat}_${lon}`;
    const cachedTimings = localStorage.getItem(cacheKey);
    let timings;
    if (cachedTimings) {
        timings = JSON.parse(cachedTimings);
    } else {
        try {
            const response = await fetch(`https://api.aladhan.com/v1/timings/${dateStr}?latitude=${lat}&longitude=${lon}&method=2`, { timeout: 10000 });
            if (!response.ok) throw new Error(`Aladhan API error: ${response.status} - ${response.statusText}`);
            const data = await response.json();
            timings = data.data.timings;
            localStorage.setItem(cacheKey, JSON.stringify(timings));
        } catch (error) {
            console.error("Error fetching prayer times from API:", error);
            document.getElementById("countdown").innerText = `خطأ في جلب مواعيد الصلاة: ${error.message}`;
            const loadingModal = bootstrap.Modal.getInstance(document.getElementById("loadingModal"));
            loadingModal.hide();
            showPersistentModal();
            return;
        }
    }

    const prayerTimes = {
        Fajr: new Date(date),
        Dhuhr: new Date(date),
        Asr: new Date(date),
        Maghrib: new Date(date),
        Isha: new Date(date)
    };

    const [fajrHours, fajrMinutes] = timings.Fajr.split(":");
    prayerTimes.Fajr.setHours(parseInt(fajrHours), parseInt(fajrMinutes), 0, 0);
    const fajrJamaah = new Date(prayerTimes.Fajr); fajrJamaah.setMinutes(fajrJamaah.getMinutes() + 15);

    const [dhuhrHours, dhuhrMinutes] = timings.Dhuhr.split(":");
    prayerTimes.Dhuhr.setHours(parseInt(dhuhrHours), parseInt(dhuhrMinutes), 0, 0);
    const dhuhrJamaah = new Date(prayerTimes.Dhuhr); dhuhrJamaah.setMinutes(dhuhrJamaah.getMinutes() + 15);

    const [asrHours, asrMinutes] = timings.Asr.split(":");
    prayerTimes.Asr.setHours(parseInt(asrHours), parseInt(asrMinutes), 0, 0);
    const asrJamaah = new Date(prayerTimes.Asr); asrJamaah.setMinutes(asrJamaah.getMinutes() + 15);

    const [maghribHours, maghribMinutes] = timings.Maghrib.split(":");
    prayerTimes.Maghrib.setHours(parseInt(maghribHours), parseInt(maghribMinutes), 0, 0);
    const maghribJamaah = new Date(prayerTimes.Maghrib); maghribJamaah.setMinutes(maghribJamaah.getMinutes() + 15);

    const [ishaHours, ishaMinutes] = timings.Isha.split(":");
    prayerTimes.Isha.setHours(parseInt(ishaHours), parseInt(ishaMinutes), 0, 0);
    const ishaJamaah = new Date(prayerTimes.Isha); ishaJamaah.setMinutes(ishaJamaah.getMinutes() + 15);

    console.log("Prayer Times:", {
        Fajr: prayerTimes.Fajr.toString(),
        Dhuhr: prayerTimes.Dhuhr.toString(),
        Asr: prayerTimes.Asr.toString(),
        Maghrib: prayerTimes.Maghrib.toString(),
        Isha: prayerTimes.Isha.toString()
    });

    document.getElementById("fajr-time").innerText = to12HourFormat(parseInt(fajrHours), parseInt(fajrMinutes));
    document.getElementById("fajr-jamaah").innerText = `جماعة: ${to12HourFormat(fajrJamaah.getHours(), fajrJamaah.getMinutes())}`;
    document.getElementById("dhuhr-time").innerText = to12HourFormat(parseInt(dhuhrHours), parseInt(dhuhrMinutes));
    document.getElementById("dhuhr-jamaah").innerText = `جماعة: ${to12HourFormat(dhuhrJamaah.getHours(), dhuhrJamaah.getMinutes())}`;
    document.getElementById("asr-time").innerText = to12HourFormat(parseInt(asrHours), parseInt(asrMinutes));
    document.getElementById("asr-jamaah").innerText = `جماعة: ${to12HourFormat(asrJamaah.getHours(), asrJamaah.getMinutes())}`;
    document.getElementById("maghrib-time").innerText = to12HourFormat(parseInt(maghribHours), parseInt(maghribMinutes));
    document.getElementById("maghrib-jamaah").innerText = `جماعة: ${to12HourFormat(maghribJamaah.getHours(), maghribJamaah.getMinutes())}`;
    document.getElementById("isha-time").innerText = to12HourFormat(parseInt(ishaHours), parseInt(ishaMinutes));
    document.getElementById("isha-jamaah").innerText = `جماعة: ${to12HourFormat(ishaJamaah.getHours(), ishaJamaah.getMinutes())}`;

    const loadingModal = bootstrap.Modal.getInstance(document.getElementById("loadingModal"));
    loadingModal.hide();
    startCountdown(prayerTimes);
    fetchRandomVerse();

    const today = date.toDateString();
    const cachedHijri = localStorage.getItem(`hijri_${today}`);
    if (cachedHijri) {
        document.getElementById("ramadan-day").innerText = cachedHijri;
    } else {
        try {
            const response = await fetch(`https://api.aladhan.com/v1/gToH?date=${dateStr}`, { timeout: 5000 });
            if (!response.ok) throw new Error(`Aladhan Hijri API error: ${response.status}`);
            const data = await response.json();
            const hijriDay = toArabicNumerals(data.data.hijri.day);
            const hijriMonth = toArabicNumerals(data.data.hijri.month.number);
            const hijriYear = toArabicNumerals(data.data.hijri.year);
            let hijriText;
            if (data.data.hijri.month.number === 9) {
                const remainingDays = toArabicNumerals(30 - parseInt(data.data.hijri.day));
                hijriText = `اليوم ${hijriDay} من رمضان ${hijriYear} (${remainingDays} أيام متبقية)`;
            } else {
                hijriText = `اليوم ${hijriDay}/${hijriMonth}/${hijriYear}`;
            }
            document.getElementById("ramadan-day").innerText = hijriText;
            localStorage.setItem(`hijri_${today}`, hijriText);
        } catch (error) {
            document.getElementById("ramadan-day").innerText = "خطأ في جلب التاريخ الهجري.";
            console.error("Error fetching Hijri date:", error);
        }
    }

    setInterval(setDynamicBackground, 60000);
}

function startCountdown(prayerTimes) {
    const countdownElement = document.getElementById("countdown");
    const titleElement = document.getElementById("prayer-title");

    function updateCountdown() {
        const now = new Date();
        let nextPrayerTime = null;
        let nextPrayerName = "";

        const prayers = [
            { name: "الفجر", time: prayerTimes.Fajr },
            { name: "الظهر", time: prayerTimes.Dhuhr },
            { name: "العصر", time: prayerTimes.Asr },
            { name: "المغرب", time: prayerTimes.Maghrib },
            { name: "العشاء", time: prayerTimes.Isha }
        ];

        for (const prayer of prayers) {
            if (now < prayer.time) {
                nextPrayerTime = prayer.time;
                nextPrayerName = prayer.name;
                break;
            }
        }

        if (!nextPrayerTime) {
            nextPrayerTime = new Date(prayerTimes.Fajr);
            nextPrayerTime.setDate(nextPrayerTime.getDate() + 1);
            nextPrayerName = "الفجر";
            if (nextPrayerTime - now > 24 * 60 * 60 * 1000) {
                nextPrayerTime.setDate(nextPrayerTime.getDate() - 1);
            }
        }

        const timeLeft = nextPrayerTime - now;

        console.log("Current Time:", now.toString());
        console.log("Next Prayer:", nextPrayerName, "at", nextPrayerTime.toString());
        console.log("Time Left (ms):", timeLeft);

        if (timeLeft <= 0) {
            console.log(`Prayer ${nextPrayerName} time reached, finding next prayer...`);
            setTimeout(updateCountdown, 1000);
            return;
        }

        const hours = Math.floor(timeLeft / (1000 * 60 * 60));
        const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

        titleElement.innerText = `الوقت حتى صلاة ${nextPrayerName}`;
        countdownElement.innerText = `${toArabicNumerals(hours)}س ${toArabicNumerals(minutes)}د ${toArabicNumerals(seconds)}ث`;
        updatePrayerStatus(prayerTimes, nextPrayerTime);
        setTimeout(updateCountdown, 1000);
    }

    updateCountdown();
}

function updatePrayerStatus(prayerTimes, nextPrayerTime) {
    const now = new Date();
    const statuses = {
        "fajr-status": prayerTimes.Fajr,
        "dhuhr-status": prayerTimes.Dhuhr,
        "asr-status": prayerTimes.Asr,
        "maghrib-status": prayerTimes.Maghrib,
        "isha-status": prayerTimes.Isha
    };
    for (const [id, time] of Object.entries(statuses)) {
        const element = document.getElementById(id);
        if (now > time) element.className = "prayer-status status-past";
        else if (time === nextPrayerTime) element.className = "prayer-status status-current";
        else element.className = "prayer-status status-upcoming";
    }
}

function shareSite() {
    const url = window.location.href;
    const text = `تفقد مواعيد الصلاة من هنا: ${url}`;
    if (navigator.share) {
        navigator.share({ title: "مواعيد الصلاة", text: text, url: url });
    } else {
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    }
}

function showPersistentModal() {
    const modal = new bootstrap.Modal(document.getElementById("locationModal"), {
        backdrop: 'static',
        keyboard: false
    });
    modal.show();

    document.getElementById("retryLocation").onclick = function() {
        navigator.geolocation.getCurrentPosition(
            position => {
                fetchPrayerAndRamadan(position);
                modal.hide();
            },
            error => {
                console.error("Retry failed:", error);
                document.getElementById("countdown").innerText = `خطأ في إعادة المحاولة: ${error.message}`;
                modal.hide();
            }
        );
    };
}

function showError(error) {
    document.getElementById("countdown").innerText = `تعذر الحصول على الموقع:`;
    console.error("Geolocation error:", error);
    const loadingModal = bootstrap.Modal.getInstance(document.getElementById("loadingModal"));
    loadingModal.hide();
    showPersistentModal();
}

getLocation();