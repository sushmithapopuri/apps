import sqlite3

def get_connection():
    try:
        return sqlite3.connect('url-base.db')
    except Exception as e:
        print(e)

def create_table(table_sql):
    try:
        connection = get_connection()
        cursor = connection.cursor()
        cursor.execute("DROP TABLE IF EXISTS urlbank")
        cursor.execute(table_sql)
        connection.commit()
        connection.close()
        print("Table created successfully........")
    except Exception as e:
        print(e)

status_table = 'CREATE TABLE IF NOT EXISTS urlbank (\
                        id text PRIMARY KEY,\
                        parenturl text NOT NULL,\
	                    surl text,\
                        usage number,\
                        createdtime text NOT NULL,\
                        lastusedtime text NOT NULL\
                    );'

create_table(status_table)