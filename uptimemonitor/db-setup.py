import sqlite3

def get_connection():
    try:
        return sqlite3.connect('status-check.db')
    except Exception as e:
        print(e)

def create_table(table_sql):
    try:
        connection = get_connection()
        cursor = connection.cursor()
        cursor.execute("DROP TABLE IF EXISTS status")
        cursor.execute(table_sql)
        connection.commit()
        connection.close()
        print("Table created successfully........")
    except Exception as e:
        print(e)

status_table = 'CREATE TABLE IF NOT EXISTS status (\
                        id text PRIMARY KEY,\
                        updateTimestamp text NOT NULL,\
	                    status text,\
                        latency text,\
	                    detail text\
                    );'

create_table(status_table)