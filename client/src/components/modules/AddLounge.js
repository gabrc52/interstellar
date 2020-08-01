import React, { Component, useState } from "react";
import { List, Modal, Row, Col, Button, Form, Input, DatePicker, Checkbox } from "antd";
export default function AddLounge(props) {
  const [form] = Form.useForm();
  let onFinish = (fieldsValue) => {
    props.createNewLounge({
      name: fieldsValue.name,
    })
    form.resetFields();
    props.setVisible(false);
  };

  return (
    <Modal
      visible={props.visible}
      title={"Add New Lounge"}
      onCancel={() => {
        form.resetFields();
        props.setVisible(false);
      }}
      footer={[
        <Button
          key="back"
          onClick={() => {
            form.resetFields();
            props.setVisible(false);
          }}
        >
          Return
        </Button>,
      ]}
    >
      
          <Form form={form} name={"Add New Lounge"}
           onFinish={onFinish}
           >

            <Form.Item
              name="name"
              label="Lounge Name"
              rules={[
                {
                  required: true,
                  message: "Please enter a lounge name",
                },
              ]}
            >
              <Input />
            </Form.Item>
            
            <Form.Item>
              <Button key="submit" type="primary" htmlType="submit">
                Submit
              </Button>
            </Form.Item>
          </Form>
       
    </Modal>
  );
}