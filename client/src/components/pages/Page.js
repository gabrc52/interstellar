import React, { Component } from "react";
import { get, post } from "../../utilities";
import DashboardTab from "../modules/DashboardTab";
import ForumTab from "../modules/ForumTab";
import LoungesTab from "../modules/LoungesTab";
import InfoTab from "../modules/InfoTab";
import TabPage from "../modules/TabPage";
import { socket } from "../../client-socket.js";
import { Spin, Space, Button } from 'antd';

import {UserAddOutlined, UserDeleteOutlined} from '@ant-design/icons';
class Page extends Component {
  constructor(props) {
    super(props);
    // Initialize Default State
    let selectedPage = this.props.computedMatch.params.selectedPage
    console.log(selectedPage)
    this.state = {
      pageName: selectedPage,
      users: [],
      dueDates: [],
      quickLinks: [],
      lounges: [],
      page: {},
      pageLoaded: false
    };
    props.updateSelectedPageName(selectedPage)
  }

  /*
createNewDDQL
Input: {
	title: String,
	objectType: String ("DueDate" or "QuickLink")
	dueDate: Date,
	url: String,
	pageId: String,
	visibility: String ("Public" or "Only Me")
}*/
  createNewDDQL = (input, callback) => {
    post("/api/createNewDDQL", Object.assign(input, {pageId: this.state.page._id})).then((data) => {
      
     if(!data.created) return
      let DDQL = data.DDQL 
      post("/api/addOrCompleteDDQL", {objectId: DDQL._id,
        action: "add",
        amount: "single" 
      }).then((result) => {
        if(result.done) {
          if(DDQL.objectType === "DueDate") {
            let DDQLs = this.state.dueDates
            DDQL.addedUserIds = [this.props.user.userId]
            DDQLs.push(DDQL) 
            this.setState({dueDates: DDQLs})
          } 
          else {
            let DDQLs = this.state.quickLinks
            DDQL.addedUserIds = [this.props.user.userId]
            DDQLs.push(DDQL) 
            this.setState({quickLinks: DDQLs})
          }
          callback(DDQL._id)
        }
      })
    

    })
  }

  editDDQL = (input) => {
    post("/api/editDDQL", input).then((data) => {
      if(data.edited) {
        if(data.DDQL.objectType === "DueDate") {
          let DDQLs = this.state.dueDates.filter((duedate) => {return duedate._id !== data.DDQL._id})
          DDQLs.push(data.DDQL) 
          this.setState({dueDates: DDQLs})
        } 
        else {
          let DDQLs = this.state.quickLinks.filter((quicklink) => {return quicklink._id !== data.DDQL._id})
          DDQLs.push(data.DDQL) 
          this.setState({quickLinks: DDQLs})
        }
      }
    })
    
  }

  createNewLounge = (data) => {
    post("/api/createNewLounge", {
      name: data.name,
      pageId: this.state.page._id
    }).then((data) => {
      if(!data.created) return
      let lounges = this.state.lounges
      lounges.push(data.lounge)
      this.setState({lounges: lounges})
    });
  }

  addToLounge = (userId, loungeId, callback = ()=>{}) => {
    let lounges = this.state.lounges
    let lounge = lounges.filter((l)=>{return l._id+"" === loungeId})[0]

    let newLounges = lounges.filter((l)=>{return l._id+"" !== loungeId})
        
    let userIds = lounge.userIds
    userIds.push(userId)
    lounge.userIds = userIds 
    newLounges.push(lounge)
    this.setState({lounges: newLounges}, callback)
  }

  removeFromLounge = (userId, loungeId, callback = ()=>{}) => {
      if(loungeId !== "") {
      let lounges = this.state.lounges
      let lounge = lounges.filter((l)=>{return l._id+"" === loungeId})[0]
  
      let newLounges = lounges.filter((l)=>{return l._id+"" !== loungeId})
          
      let userIds = lounge.userIds.filter((id) => {return id !== userId})
      lounge.userIds = userIds 
      console.log("newlounge") 
      console.log(lounge)
      newLounges.push(lounge)
      this.setState({lounges: newLounges}, callback)
      }
      else {
        callback()
      }
    
  }

  addSelfToLounge = (loungeId, callback=()=>{}) => {
    post("/api/addSelfToLounge", {
      loungeId: loungeId
    }).then((data) => {
      console.log(data)
      console.log("added")
      if(data.added) {
        this.addToLounge(this.props.user.userId, loungeId,  callback)
       
      }
    });
  }

  removeSelfFromLounge = (loungeId, callback=()=>{}) => {
    post("/api/removeSelfFromLounge", {
      loungeId: loungeId
    }).then((data) => {
      console.log(data)
      console.log("removed")
      if(data.removed) {
        this.removeFromLounge(this.props.user.userId, loungeId, callback)
        
      }
    });
  }

   
  

  componentDidMount() {
    post("/api/joinPage", {pageName: this.state.pageName, schoolId: this.props.schoolId}).then((data) => {
      console.log(data)
      this.setState({
        users: data.users,
        dueDates: data.dueDates,
        quickLinks: data.quickLinks,
        lounges: data.lounges,
        page: data.page,
        pageLoaded: true,
        inPage: data.inPage  
    })})
    // remember -- api calls go here!

    socket.on("userAddedToLounge", (data) => {
      this.addToLounge(data.userId, data.loungeId)
    })

    socket.on("userRemovedFromLounge", (data) => {
      this.removeFromLounge(data.userId, data.loungeId)
    })
  }

  render() {
    if(!this.state.pageLoaded) {
      return (<Spin />)
    }

    let addClassButton = this.state.inPage ? 
      <Button type="primary" onClick={() => {
        post("/api/removeSelfFromPage", {pageId: this.state.page._id}).then((data) => {
          if(data.removed) {
            this.props.updatePageIds(this.props.pageIds.filter((id)=>{return id!==this.state.page._id}))
            this.setState({inPage: false})
            this.props.redirectPage("/"+this.state.page.pageType.toLowerCase()+"/"+this.state.page.name + "/info")
          }
          else
            console.log("error")

        })
      }}><UserDeleteOutlined /></Button> :
        <Button type="primary" onClick={() => {
          post("/api/addSelfToPage", {pageId: this.state.page._id}).then((data) => {
            if(data.added)  {
              let newPageIds = this.props.pageIds
              newPageIds.push(this.state.page._id)
              this.props.updatePageIds(newPageIds)
              this.setState({inPage: true})
              this.componentDidMount()
            }
            else
              console.log("error")

          })
        }}><UserAddOutlined /></Button>
    return (
      <>
        <Space>
        <h1>{this.state.page.name}</h1>
        
        {addClassButton}
        </Space>
       
        {this.state.inPage ? 
        <TabPage
          labels={["Dashboard", "Lounges", "Forum", "Info"]}
          routerLinks={["dashboard", "lounges", "forum", "info"]}
          defaultRouterLink={this.state.inPage ? "info" : "info"}
          page={this.state.page}
        > 
          
          <DashboardTab 
            dueDates = {this.state.dueDates}
            quickLinks = {this.state.quickLinks}
            lounges = {this.state.lounges}
            users = {this.state.users}
            page = {this.state.page}
            createNewDDQL = {this.createNewDDQL}
            editDDQL = {this.editDDQL}
            user={this.props.user}
          />
          <LoungesTab 
            lounges = {this.state.lounges}
            users = {this.state.users}
            page = {this.state.page}
            addSelfToLounge = {this.addSelfToLounge}
            removeSelfFromLounge = {this.removeSelfFromLounge}
            createNewLounge = {this.createNewLounge}
            loungeId = {this.props.loungeId} 
            setLoungeId = {this.props.setLoungeId}
          />
          <ForumTab /> 
          <InfoTab users={this.state.users} inPage={true} page={this.state.page} user={this.props.user} />)
        </TabPage> 
            :
            <TabPage
          labels={["Info"]}
          routerLinks={["info"]}
          defaultRouterLink={"info"}
          page={this.state.page}
        > 
            <InfoTab users={this.state.users} inPage={false} page={this.state.page} user={this.props.user} />

        </TabPage>
        }
      </>
    );
  }
}

export default Page;