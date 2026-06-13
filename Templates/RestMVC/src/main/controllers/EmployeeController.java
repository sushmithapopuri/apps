package controllers;

import java.awt.print.Book;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;

import models.Employee;
import services.EmployeeService;

@RestController
public class EmployeeController {
	@Autowired
	   private EmployeeService employeeService;

	   /*---Add new book---*/
	   @RequestMapping(value="/post",method=RequestMethod.POST )
	   public ResponseEntity<?> save(@RequestBody Employee employee) {
	      String id = employeeService.save(employee);
	      return ResponseEntity.ok().body("New Book has been saved with ID:" + id);
	   }

	   /*---Get a book by id---*/
	   @RequestMapping(value="/get/{id}",method=RequestMethod.GET )
	   public ResponseEntity<Employee> get(@PathVariable("id") String id) {
	      Employee employee= employeeService.get(id);
	      return ResponseEntity.ok().body(employee);
	   }

	   /*---get all books---*/
//	   @GetMapping("/book")
//	   public ResponseEntity<List<Employee>> list() {
//	      List<Employee> employees = employeeService.list();
//	      return ResponseEntity.ok().body(employees);
//	   }

	   /*---Update a book by id---*/
	   @RequestMapping(value="/update",method=RequestMethod.PUT )
	   public ResponseEntity<?> update(@RequestBody Employee employee) {
	      employeeService.update(employee);
	      return ResponseEntity.ok().body("Book has been updated successfully.");
	   }

	   /*---Delete a book by id---*/
	   @RequestMapping(value="/delete",method=RequestMethod.DELETE )
	   public ResponseEntity<?> delete(@RequestBody Employee employee) {
	      employeeService.delete(employee);
	      return ResponseEntity.ok().body("Book has been deleted successfully.");
	   }
}
