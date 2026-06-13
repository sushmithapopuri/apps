package resources;

import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;

import beans.User;
import business.UserData;

@Path("/users")
public class HelloResource {

	@GET
	@Produces("text/plain")
	public String handleGreeting() {
		return "Success";
	}
	@POST
	@Path("/addnewuser")
	@Produces("text/plain")
	public static String signUp(@QueryParam("name") String username,@QueryParam("auth_id") String authId,
			@QueryParam("phNo")String nubmer,@QueryParam("email") String email,@QueryParam("details") String details,
			@QueryParam("org") String organization,@QueryParam("credit") String credit,
			@QueryParam("token") String token,@QueryParam("secret")String secret,@QueryParam("pin")String pin){
		User user=new User();
		user.setAuthId(authId);
		user.setName(username);
		user.setPhoneNumber(nubmer);
		user.setEmail(email);
		user.setOrganization(organization);
		user.setDetails(details);
		user.setCredit(credit);
		//	user.setAuthId("2423");
		//	user.setEmail("user1@api.com");
		//	user.setName("user1");
		//	user.setDetails("Test1");
		//	user.setPhoneNumber("1234567890");
		//	user.setOrganization("org1");
		String status= UserData.registerUser(user,token,secret,pin);
		return status;
	}

	@POST
	@Path("/edituser")
	@Produces("text/plain")
	public static String editUser(@QueryParam("name") String username,@QueryParam("auth_id")String authId,
			@QueryParam("phNo")String number,@QueryParam("email") String email,@QueryParam("pin")String pin,
			@QueryParam("details") String details,@QueryParam("org") String organization,
			@QueryParam("token") String token,@QueryParam("secret")String secret,
			@QueryParam("credit")String credit){

		User user=new User();
		user.setAuthId(authId);
		user.setName(username);
		user.setPhoneNumber(number);
		user.setEmail(email);
		user.setOrganization(organization);
		user.setDetails(details);
		user.setCredit(credit);
		//	user.setAuthId("2423");
		//	user.setEmail("user1@api.com");
		//	user.setName("user1");
		//	user.setDetails("Test1");
		//	user.setPhoneNumber("1234567890");
		//	user.setOrganization("org1");
		try{
			return UserData.editUser(token,secret,pin,user);
		}catch(Exception exception){
			return "Some Error Occured! Please try later";
		}
	}

	@GET
	@Path("/getuser")
	@Produces("application/json")
	public static User getUser(@QueryParam("auth_id") String authId){
		User user= UserData.getUser(authId);
		if(user==null){
			user=new User();
			user.setName("none");
			user.setEmail("none");
			user.setPhoneNumber("none");
			user.setDetails("none");
			user.setCredit("none");
			user.setOrganization("none");
			user.setAuthId(authId);
		}
		return user;
	}
	//		public static void main(String[] args){
	//			User user=new User();
	////			user.setAuthId("1ZWSp+L+nDvwudBwHs4c5Q==\n");
	////			user.setName("pa");
	////			user.setPhoneNumber("9999900009");
	////			user.setEmail("usr@pa.com");
	////			user.setOrganization("none");
	////			user.setCredit("0");
	////			user.setDetails("details");
	//			String authId="ZR2DFp8A%2F9MRUOXZA%20MSBg%3D%3D";
	//			String token="bd584f009690b2b8e7f713bf71e5397d";
	//			String secret="ec0b76a931c5a06a91dd44f280a4d906e9a36feab8cca0fd4ce53a68360a24ec";
	////			DbConnect.registerUser(user, token, secret, "2622");
	//			DbConnect.connectPA(token, secret, "1234", authId, "new");
	//		}
	@GET
	@Path("/updatecredit")
	@Produces("application/json")
	public static String updateCredit(@QueryParam("auth_id") String authId,
			@QueryParam("amount")String amount,@QueryParam("check") String check){
		User user=getUser(authId);
		if (user==null){
			return "Some Error Occured! Please try again Later";
		}
		else if (check.equals("true")){
			//			user.getCredit()
		}
		return null;
	}
	@GET
	@Path("/getcredit")
	@Produces("application/text")
	public static String getCredit(@QueryParam("token") String token,@QueryParam("secret")String secret,
			@QueryParam("auth_id") String authId,@QueryParam("pin") String pin){
		return UserData.getCredit(token, secret, authId, pin);
	}
}
