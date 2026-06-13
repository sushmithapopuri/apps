package services;

import java.awt.print.Book;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import dao.EmployeeDao;
import models.Employee;

@Service
@Transactional(readOnly = true)
public class EmployeeService {

	
	@Autowired
	   private EmployeeDao employeeDao;

	  @Transactional
	   public String save(Employee employee) {
	      return employeeDao.save(employee);
	   }

	   public Employee get(String id) {
	      return employeeDao.get(id);
	   }

//	   public List<Employee> list() {
//	      return employeeDao.list();
//	   }

	   @Transactional
	   public void update(Employee employee) {
	      employeeDao.update(employee);
	   }

	   @Transactional
	   public void delete(Employee employee) {
	      employeeDao.delete(employee);
	   }
}
