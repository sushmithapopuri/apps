import flask
from flask import jsonify
import os
import statusmonitor

app = flask.Flask(__name__)
app.config["DEBUG"] = True

@app.route('/stats', methods=['GET'])
def getstatus():
    return jsonify(statusmonitor.fetch_status_history('',''))

@app.route('/start', methods=['GET'])
def start_check():
    url = r'https://stackoverflow.com/questions/8533318/multiprocessing-pool-when-to-use-apply-apply-async-or-mapas'
    # statusmonitor.status_check(url)
    os.system("python up-time-monitor\statusmonitor.py")
    return 'success'

app.run()