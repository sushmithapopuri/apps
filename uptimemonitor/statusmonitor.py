import sqlite3
import requests
import datetime as dt
import multiprocessing
import time

def fetch_status_history(from_date,to_date):
    connection = sqlite3.connect('status-check.db')
    cursor = connection.cursor()
    cursor.execute('SELECT * from status')
    result = cursor.fetchall()
    connection.close()
    data = []
    for row in result:
        data.append({'id':row[0],'updateTimestamp':row[1],'status':row[2],'detail':row[3],'latency':row[4]})
    return data

def store_status(status):
    try:
        connection = sqlite3.connect('status-check.db')
        cursor = connection.cursor()
        query = "INSERT INTO status(id, updateTimestamp, status, latency, detail) VALUES ({},'{}','{}','{}','{}')".format(dt.datetime.now().timestamp(),status['timestamp'],status['status'],status['latency'],status['detail'])
        cursor.execute(query)
        connection.commit()
        connection.close()
    except Exception as e:
        print(e)

def print_error(error_msg):
    print(dt.datetime.now().timestamp(),error_msg)

def ping_site(url):
    status = {'timestamp':dt.datetime.now().strftime('%d-%m-%Y %H:%M:%S')}
    response = response = requests.get(url)
    status['status'] = response.status_code
    if response.status_code == 200:
        status['detail'] = ''
    else:
        status['detail'] = response.text
    return status

def status_check(url):
    pool = multiprocessing.Pool(5)
    while True:
    # for i in range(2):
        pool.apply_async(ping_site, args = (url, ), callback = store_status,error_callback=print_error)
        time.sleep(10)
    pool.close()
    pool.join()



if __name__ == '__main__':

    url = r'https://stackoverflow.com/questions/8533318/multiprocessing-pool-when-to-use-apply-apply-async-or-mapas'
    status_check(url)
    # fetch_status_history('a','b')

