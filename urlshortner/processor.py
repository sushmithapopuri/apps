import sqlite3
import requests
import datetime as dt
import multiprocessing
import time
import random
import string

def print_error(error_msg):
    print(dt.datetime.now().timestamp(),error_msg)

def generate_key():
    char_set = string.ascii_lowercase + string.digits
    return ''.join(random.sample(char_set*6, 6))

def url_bank_operator(operator,query,params = []):
    result = []
    try:
        connection = sqlite3.connect('url-base.db')
        cursor = connection.cursor()
        if params:
            cursor.execute(query,params)
        else:
            cursor.execute(query)
        if operator in ['I','D','U']:
            connection.commit()
        if operator == 'R':
            result = cursor.fetchall()
        connection.close()
        return result
    except Exception as e:
        print(e)


def store_url(url_data):
    query = "INSERT INTO urlbank(id,createdtime,lastusedtime, parenturl, surl, usage) VALUES ('{}','{}','{}','{}','{}',{})".format(url_data['id'],dt.datetime.now().timestamp(),dt.datetime.now().timestamp(),url_data['ourl'],url_data['nurl'],url_data['usage'])
    url_bank_operator('I',query)    

def get_all_urls():
    query = 'SELECT * from urlbank'
    result = url_bank_operator('R',query)
    if result:
        data = []
        for row in result:
            data.append({'id':row[0],'ourl':row[1],'nurl':row[2],'usage':row[3]})
        return data
    return []
    
def get_url(id):
    query = 'SELECT * from urlbank where id =?'
    result = url_bank_operator('R',query,[id])
    if result:
        data = []
        for row in result:
            data.append({'id':row[0],'ourl':row[1],'nurl':row[2],'usage':row[3]})
        return data
    return []

def check_url_bank(id):
    data = []
    query = 'SELECT * FROM urlbank where parenturl = ?'
    result = url_bank_operator('R',query,[id])
    if result:
        for row in result:
            data.append({'id':row[0],'ourl':row[1],'nurl':row[2],'usage':row[3]})
    return len(data)==0, data

def shorten_url(parent):
    flag, url_data= check_url_bank(parent)
    print(flag,url_data)
    if not flag:
        return url_data[0]['nurl']
    else:
        url_data = {}
        url_data['id'] = generate_key()
        url_data['usage']= 1
        url_data['ourl'] = parent
        url_data['nurl'] = 'http://127.0.0.1:5000/{}'.format(url_data['id'])
        store_url(url_data)
    print(url_data)
    return url_data['nurl']

def update_usage(id):
    query = 'UPDATE urlbank SET usage = usage+1 , lastusedtime = "{}"'.format(dt.datetime.now().timestamp())
    url_bank_operator('U',query)

def get_site(id):
    url = get_url(id)
    if url:
        update_usage(id)
        return url[0]['ourl']
    else:
        return ''

if __name__ == '__main__':

    url = r'https://stackoverflow.com/questions/8533318/multiprocessing-pool-when-to-use-apply-apply-async-or-mapas'
    # status_check(url)
    # fetch_status_history('a','b')

