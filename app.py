from flask import Flask, render_template, jsonify
import socket
from datetime import datetime

app = Flask(__name__)

history = []


def get_local_ip():
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        sock.connect(("8.8.8.8", 80))
        ip = sock.getsockname()[0]
        sock.close()
        return ip
    except Exception:
        return "127.0.0.1"


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/api/status")
def status():
    return jsonify({
        "online": True,
        "hostname": socket.gethostname(),
        "local_ip": get_local_ip(),
        "time": datetime.now().strftime("%d-%m-%Y %H:%M:%S")
    })


@app.route("/api/history")
def get_history():
    return jsonify(history)


@app.route("/api/history/<int:index>", methods=["DELETE"])
def delete_history(index):
    if 0 <= index < len(history):
        history.pop(index)

    return jsonify({"success": True})


@app.route("/api/clear-history", methods=["POST"])
def clear_history():
    history.clear()
    return jsonify({"success": True})


@app.route("/api/save-test", methods=["POST"])
def save_test():
    from flask import request

    data = request.get_json()

    result = {
        "time": datetime.now().strftime("%d-%m-%Y %H:%M:%S"),
        "download": round(float(data.get("download", 0)), 2),
        "upload": round(float(data.get("upload", 0)), 2),
        "ping": round(float(data.get("ping", 0)), 2)
    }

    history.insert(0, result)

    # Maximum 100 records
    if len(history) > 100:
        history.pop()

    return jsonify(result)


if __name__ == "__main__":
    print("=" * 50)
    print("        NET SPEED MONITOR")
    print("=" * 50)
    print("PC URL  : http://127.0.0.1:5000")
    print("LAN URL : http://" + get_local_ip() + ":5000")
    print("=" * 50)

    app.run(
        host="0.0.0.0",
        port=5000,
        debug=False,
        threaded=True
    )