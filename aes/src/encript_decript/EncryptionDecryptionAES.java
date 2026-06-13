package encript_decript;

import java.io.IOException;
import java.io.OutputStream;
import java.security.MessageDigest;
import java.util.Arrays;
import java.util.Base64;

import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;

import fileHandler.FileProcessor;




public class EncryptionDecryptionAES {
	static Cipher cipherk;

	public static void main(String[] args) throws Exception {
		String[] fileData=FileProcessor.readFile("C:\\Users\\Sushmitha.Popuri\\Desktop\\GTINS.docx");
		byte[] key=fileData[1].getBytes();
		
		MessageDigest sha = MessageDigest.getInstance("SHA-1");
		key = sha.digest(key);
		key = Arrays.copyOf(key, 16);

		SecretKeySpec secretKey = new SecretKeySpec(key,"AES");
		
		cipherk = Cipher.getInstance("AES");
				
		System.out.println("Plain Text Before Encryption: " + fileData[0]);
		
		byte[] compressedData=FileProcessor.compressData(fileData[0].getBytes());
		
		System.out.println("Compressed Data: "+compressedData);
		
		String encryptedText = encrypt(new String(compressedData,0,compressedData.length), secretKey);
		System.out.println("Encrypted Text After Encryption using secret Key: " + encryptedText);
		
		FileProcessor.writeFile(encryptedText, "C:\\Users\\Sushmitha.Popuri\\Desktop\\AES.txt");
//		
//		String decryptedText1 = decrypt(fileData[0], secretKey);
//		System.out.println("Decrypted Text After Decryption: " + decryptedText1);
//		System.out.println("Data: "+new String(FileProcessor.decompressData(decryptedText1.getBytes())));
//		
	}

	public static String encrypt(String plainText, SecretKey secretKey)
			throws Exception {
		byte[] plainTextByte = plainText.getBytes();
		cipherk.init(Cipher.ENCRYPT_MODE, secretKey);
		byte[] encryptedByte = cipherk.doFinal(plainTextByte);
		Base64.Encoder encoder = Base64.getEncoder();
		String encryptedText = encoder.encodeToString(encryptedByte);
		return encryptedText;
	}

	public static String decrypt(String encryptedText, SecretKey secretKey)
			throws Exception {
		Base64.Decoder decoder = Base64.getDecoder();
		byte[] encryptedTextByte = decoder.decode(encryptedText);
		cipherk.init(Cipher.DECRYPT_MODE, secretKey);
		byte[] decryptedByte = cipherk.doFinal(encryptedTextByte);
		String decryptedText = new String(decryptedByte);
		return decryptedText;
	}
	public static String encryptString(String plainText, String sk)
			throws Exception {
		byte[] plainTextByte = plainText.getBytes();
		byte[] skbyte=Base64.getDecoder().decode(sk);
		final SecretKeySpec secretKey = new SecretKeySpec(skbyte, "AES");
		cipherk.init(Cipher.ENCRYPT_MODE, secretKey);
		byte[] encryptedByte = cipherk.doFinal(plainTextByte);
		Base64.Encoder encoder = Base64.getEncoder();
		String encryptedText = encoder.encodeToString(encryptedByte);
		return encryptedText;
	}
}
