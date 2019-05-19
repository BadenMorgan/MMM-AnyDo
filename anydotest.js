"use strict";
const Api = require('anydo-api');
require('dotenv').config()

const api = new Api();

if(process.env.TOKEN) {
  console.log("Using token from .env file");
  api.setToken({token: process.env.TOKEN});
} else {
  console.log("Logging in to obtain token");
  api.login({email: process.env.EMAIL, password: process.env.PASSWORD})
  .then(loginPromise => {
    console.log(`Your API token is: ${api.authToken}`);
    console.log();
    console.log(`  echo TOKEN="${api.authToken}" >> .env`);
    console.log();
  });
}

class ResultSet {

  constructor(res) {
    this.res = res;
    this.models = this.res.models;
  }

  categoryMap(){
    const categoryMap = {};
    this.models.category.items.forEach(category => {
      categoryMap[category.id] = category;
    });
    return categoryMap;
  }

  tasksByCategory(){
    const categoryMap = this.categoryMap();
    const itemCategoryMap = {};
    this.models.task.items.forEach(item => {
      //console.log(item.subTasks.length);
      if(item.parentGlobalTaskId === null && item.status == "UNCHECKED"){
        //console.log(item.title, item.categoryId);
        if(item.categoryId in itemCategoryMap){
          itemCategoryMap[item.categoryId].items.push(item);
        } else {
          itemCategoryMap[item.categoryId] = {
            category: categoryMap[item.categoryId],
            items: new Array(item),
          };
        }
      } else {
        // this is a child item or done
        // console.log(item);
      }
    });
    return itemCategoryMap;
  }

  scheduledTasks(){
    const hasDue = [];
    this.models.task.items.forEach(item => {
      if(item.dueDate != null && item.status == "UNCHECKED"){
        //console.log(item);
        hasDue.push(item);
      }
    });
    return hasDue;
  }

  dueTasks(dueDate=null){
    if(dueDate == null){
      dueDate = new Date();
    }
    const dueTasks = this.scheduledTasks();

    const due = [];
    dueTasks.forEach(item => {
      const myDueDate = new Date(item.dueDate);
      //console.log(dueDate);
      //console.log(item.dueDate);
      if(myDueDate <= dueDate){
        item.dueDateObj = myDueDate;
        due.push(item);
      }
    });
    return due;
  }
}


api.sync()
.then(res => {
  const rs = new ResultSet(res);
  const itemCategoryMap = rs.tasksByCategory();
  Object.keys(itemCategoryMap).forEach(key => {
    var category = itemCategoryMap[key];
    console.log(`${category.category.name} has ${category.items.length} items`);
  });

  const hasDue = rs.scheduledTasks();
  console.log(`There are ${rs.models.task.items.length} items and ${hasDue.length} items with due dates`);

  const rightNow = new Date();
  const dueToday = rs.dueTasks(rightNow);
  console.log(`There are ${dueToday.length} items due today`);

  dueToday.forEach(item => {
    console.log(item.title);
  });

});
