package fileHandler;

import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileReader;
import java.io.FileWriter;
import java.util.Calendar;
import java.util.zip.Deflater;
import java.util.zip.Inflater;

public class FileProcessor {
	public static String[] readFile(String path){
		String[] fileData=new String[2];
		fileData[0]="";
		File file=new File(path);
		BufferedReader reader;
		try{
			reader = new BufferedReader(new FileReader(file));
			String line="";
			while((line=reader.readLine())!=null){
				System.out.println(line);
				fileData[0]=fileData[0]+line;
			}
			Calendar calendar=Calendar.getInstance();
			calendar.setTimeInMillis(file.lastModified());
			fileData[1]=calendar.get(Calendar.YEAR)+String.format("%02d",calendar.get(Calendar.MONTH))+
					String.format("%02d",calendar.get(Calendar.DATE));
		}
		catch (Exception e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}
		return fileData;
	}

	public static void writeFile(String data,String path){
		File file=new File(path);
		BufferedWriter writer;
		try{
			writer=new BufferedWriter(new FileWriter(file));
			writer.write(data);
			writer.flush();
		}
		catch (Exception e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}
	}

	public static byte[] compressData(byte[] data) {  
		byte[] output=null;
		Deflater deflater = new Deflater();  
		deflater.setInput(data);  
		ByteArrayOutputStream outputStream = new ByteArrayOutputStream(data.length);   
		try{
			deflater.finish();  
			byte[] buffer = new byte[1024];   
			while (!deflater.finished()) {  
				int count = deflater.deflate(buffer); // returns the generated code... index  
				outputStream.write(buffer, 0, count);   
			}  
			outputStream.close();  
			output = outputStream.toByteArray();  
			System.out.println("Original: " + data.length + " b");  
			System.out.println("Compressed: " + output.length + " b");  
		} catch (Exception e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}
		return output;  
	}
	
	public static byte[] decompressData(byte[] data) {  
		byte [] output=null;   
		Inflater inflater = new Inflater(false);   
		   inflater.setInput(data);  
		   ByteArrayOutputStream outputStream = new ByteArrayOutputStream(data.length);  
		   byte[] buffer = new byte[1024];  
		  try{
		   while (!inflater.finished()) {  
		    int count = inflater.inflate(buffer);  
		    outputStream.write(buffer, 0, count);  
		   }  
		   outputStream.close();  
		   output = outputStream.toByteArray();  
		   System.out.println("Original: " + data.length);  
		   System.out.println("Compressed: " + output.length);  
		  }catch(Exception exception){
			  exception.printStackTrace();
		  }
		   return output;  
		  }  
}

