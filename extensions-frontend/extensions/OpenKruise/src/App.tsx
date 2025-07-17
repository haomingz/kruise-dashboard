import React from 'react';
import styled from 'styled-components';
import { DashboardPage } from './components/dashboard-page';

const Wrapper = styled.h3`
  margin: 8rem auto;
  text-align: center;
`;

export default function App() {
  return <Wrapper>
    <DashboardPage />
  </Wrapper>;
}
