const $ = (id) => document.getElementById(id);

let testing = false;


// -------------------------
// UNIT CONVERTER
// -------------------------

function formatSpeed(mbps) {

    mbps = Number(mbps) || 0;

    if (mbps >= 1000) {
        return (mbps / 1000).toFixed(2) + " Gbps";
    }

    if (mbps >= 1) {
        return mbps.toFixed(2) + " Mbps";
    }

    if (mbps > 0) {
        return (mbps * 1000).toFixed(0) + " Kbps";
    }

    return "0 Kbps";
}


function formatMBps(mbps) {

    const mbpsValue = Number(mbps) || 0;

    const bytesPerSecond =
        mbpsValue * 1000000 / 8;

    if (bytesPerSecond >= 1000000) {
        return (bytesPerSecond / 1000000).toFixed(2)
            + " MB/s";
    }

    if (bytesPerSecond >= 1000) {
        return (bytesPerSecond / 1000).toFixed(2)
            + " KB/s";
    }

    return bytesPerSecond.toFixed(0) + " B/s";
}


// -------------------------
// SERVER STATUS
// -------------------------

async function updateStatus() {

    try {

        const response =
            await fetch("/api/status");

        const data =
            await response.json();

        $("connectionStatus").textContent =
            "● Online";

        $("connectionStatus").className =
            "status online";

        $("hostname").textContent =
            data.hostname;

        $("localIp").textContent =
            data.local_ip;

        $("lastUpdate").textContent =
            data.time;

    }

    catch (error) {

        $("connectionStatus").textContent =
            "● Offline";

        $("connectionStatus").className =
            "status offline";
    }
}


// -------------------------
// PING TEST
// -------------------------

async function testPing() {

    const results = [];

    for (let i = 0; i < 3; i++) {

        const start =
            performance.now();

        await fetch(
            "/api/status?time=" +
            Date.now(),
            {
                cache: "no-store"
            }
        );

        const end =
            performance.now();

        results.push(end - start);
    }

    const total =
        results.reduce(
            (a, b) => a + b,
            0
        );

    return total / results.length;
}


// -------------------------
// DOWNLOAD TEST
// -------------------------

async function testDownload() {

    const url =
        "https://speed.cloudflare.com/__down?bytes=5000000&x="
        + Date.now();

    const start =
        performance.now();

    const response =
        await fetch(
            url,
            {
                cache: "no-store"
            }
        );

    if (!response.ok) {
        throw new Error(
            "Download test failed"
        );
    }

    const reader =
        response.body.getReader();

    let totalBytes = 0;

    while (true) {

        const {
            value,
            done
        } = await reader.read();

        if (done) {
            break;
        }

        totalBytes +=
            value.byteLength;

        const elapsed =
            (performance.now() - start)
            / 1000;

        const currentMbps =
            totalBytes * 8
            / elapsed
            / 1000000;

        $("currentSpeed").textContent =
            formatSpeed(currentMbps);

        $("downloadSpeed").textContent =
            formatSpeed(currentMbps);

        $("downloadBytes").textContent =
            formatMBps(currentMbps);

        const progress =
            Math.min(
                45,
                totalBytes / 5000000 * 45
            );

        $("progressBar").style.width =
            progress + "%";
    }

    const seconds =
        Math.max(
            (performance.now() - start) / 1000,
            0.001
        );

    return (
        totalBytes * 8
        / seconds
        / 1000000
    );
}


// -------------------------
// UPLOAD TEST
// -------------------------

async function testUpload() {

    const size =
        1000000;

    const data =
        new Uint8Array(size);

    data.fill(65);

    const start =
        performance.now();

    const response =
        await fetch(
            "https://speed.cloudflare.com/__up",
            {
                method: "POST",
                body: data,
                cache: "no-store"
            }
        );

    if (!response.ok) {
        throw new Error(
            "Upload test failed"
        );
    }

    await response.arrayBuffer();

    const seconds =
        Math.max(
            (performance.now() - start) / 1000,
            0.001
        );

    return (
        size * 8
        / seconds
        / 1000000
    );
}


// -------------------------
// RUN COMPLETE TEST
// -------------------------

async function startTest() {

    if (testing) {
        return;
    }

    testing = true;

    $("startButton").disabled =
        true;

    $("startButton").textContent =
        "⏳ Testing...";

    $("progressBar").style.width =
        "3%";


    try {

        // PING

        $("testMessage").textContent =
            "Testing ping...";

        const ping =
            await testPing();

        $("ping").textContent =
            ping.toFixed(1) + " ms";


        // DOWNLOAD

        $("testMessage").textContent =
            "Testing download speed...";

        const download =
            await testDownload();

        $("downloadSpeed").textContent =
            formatSpeed(download);

        $("downloadBytes").textContent =
            formatMBps(download);


        // UPLOAD

        $("testMessage").textContent =
            "Testing upload speed...";

        $("progressBar").style.width =
            "55%";

        const upload =
            await testUpload();

        $("uploadSpeed").textContent =
            formatSpeed(upload);

        $("uploadBytes").textContent =
            formatMBps(upload);

        $("currentSpeed").textContent =
            formatSpeed(upload);

        $("progressBar").style.width =
            "100%";


        // SAVE

        await fetch(
            "/api/save-test",
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body: JSON.stringify({
                    download: download,
                    upload: upload,
                    ping: ping
                })
            }
        );


        $("testMessage").textContent =
            "✅ Speed test completed successfully.";

        loadHistory();

    }

    catch (error) {

        console.error(error);

        $("testMessage").textContent =
            "❌ Test failed. Check your internet connection and try again.";

        $("progressBar").style.width =
            "0%";
    }

    finally {

        testing = false;

        $("startButton").disabled =
            false;

        $("startButton").textContent =
            "▶ Start Test";
    }
}


// -------------------------
// LOAD HISTORY
// -------------------------

async function loadHistory() {

    try {

        const response =
            await fetch("/api/history");

        const data =
            await response.json();

        const table =
            $("historyTable");

        if (data.length === 0) {

            table.innerHTML = `
                <tr>
                    <td colspan="4">
                        No test performed yet.
                    </td>
                </tr>
            `;

            return;
        }


        table.innerHTML =
            data.map(item => `

                <tr>

                    <td>
                        ${item.time}
                    </td>

                    <td>
                        ${formatSpeed(item.download)}
                    </td>

                    <td>
                        ${formatSpeed(item.upload)}
                    </td>

                    <td>
                        ${Number(item.ping).toFixed(1)}
                        ms
                    </td>

                </tr>

            `).join("");
    }

    catch (error) {

        console.error(
            "History error:",
            error
        );
    }
}


// -------------------------
// CLEAR HISTORY
// -------------------------

async function clearHistory() {

    const answer =
        confirm(
            "Kya aap poori speed-test history delete karna chahte hain?"
        );

    if (!answer) {
        return;
    }

    await fetch(
        "/api/clear-history",
        {
            method: "POST"
        }
    );

    loadHistory();
}


// -------------------------
// EVENTS
// -------------------------

$("startButton")
    .addEventListener(
        "click",
        startTest
    );


$("clearHistory")
    .addEventListener(
        "click",
        clearHistory
    );


// -------------------------
// START
// -------------------------

updateStatus();

loadHistory();


// Status automatically update
setInterval(
    updateStatus,
    5000
);