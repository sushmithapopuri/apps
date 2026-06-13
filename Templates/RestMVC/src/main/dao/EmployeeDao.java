package dao;

import org.hibernate.Session;
import org.hibernate.SessionFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Repository;

import models.Employee;

@Repository
public class EmployeeDao {

	 @Autowired
	   private SessionFactory sessionFactory;

	   public String save(Employee employee) {
	      sessionFactory.getCurrentSession().save(employee);
	      return employee.getId();
	   }
	   public Employee get(String id) {
	      return (Employee) sessionFactory.getCurrentSession().get(Employee.class, id);
	   }

//	   public List<Employee> list() {
//	      Session session = sessionFactory.getCurrentSession();
//	      CriteriaBuilder cb = CriteriaBuilder.getCriteriaBuilder();
//	      CriteriaQuery<Book> cq = session.createQuery(Book.class);
//	      Root<Book> root = cq.from(Book.class);
//	      cq.select(root);
//	      Query<Book> query = session.createQuery(cq);
//	      return query.getResultList();
//	   }

	   public void update(Employee employee) {
	      Session session = sessionFactory.getCurrentSession();
	      session.update(employee);
	      session.flush();
	   }

	   public void delete(Employee employee) {
	      Session session = sessionFactory.getCurrentSession();
	      session.delete(employee);
	         }
}
