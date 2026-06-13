import flask
from flask import jsonify, request
import os
import processor

app = flask.Flask(__name__)
app.config["DEBUG"] = True

@app.route('/shorten', methods=['GET'])
def shorten_url():
    return jsonify(processor.shorten_url(request.args.get('surl')))

@app.route('/<id>', methods=['GET'])
def get_url(id):
    return flask.redirect(processor.get_site(id))

@app.route('/geturls', methods=['GET'])
def get_urls():
    return jsonify(processor.get_all_urls())

app.run()