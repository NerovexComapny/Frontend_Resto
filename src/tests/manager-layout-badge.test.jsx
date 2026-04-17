import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import useAuthStore from '../store/authStore';

const {
  getUnreadFeedbackCountMock,
  subscribeToFeedbackEventsMock,
  socketMock,
} = vi.hoisted(() => ({
  getUnreadFeedbackCountMock: vi.fn(),
  subscribeToFeedbackEventsMock: vi.fn(),
  socketMock: {
    emit: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
  },
}));

vi.mock('../services/socket', () => ({
  connectSocket: () => socketMock,
}));

vi.mock('../services/feedbacks', async () => {
  const actual = await vi.importActual('../services/feedbacks');
  return {
    ...actual,
    getUnreadFeedbackCount: (...args) => getUnreadFeedbackCountMock(...args),
    subscribeToFeedbackEvents: (...args) => subscribeToFeedbackEventsMock(...args),
  };
});

import ManagerLayout from '../layouts/ManagerLayout';

describe('Manager Feedback Badge', () => {
  beforeEach(() => {
    getUnreadFeedbackCountMock.mockReset();
    subscribeToFeedbackEventsMock.mockReset();
    socketMock.emit.mockReset();
    socketMock.on.mockReset();
    socketMock.off.mockReset();

    getUnreadFeedbackCountMock.mockResolvedValue(4);
    subscribeToFeedbackEventsMock.mockReturnValue(() => {});

    useAuthStore.setState({
      token: 'token-123',
      user: {
        _id: 'u-1',
        name: 'Manager User',
        role: 'manager',
        restaurant: 'rest-1',
      },
      isAuthenticated: true,
      isLoading: false,
    });
  });

  it('Feedbacks module renders with correct unread count badge', async () => {
    render(
      <MemoryRouter initialEntries={['/manager/dashboard']}>
        <ManagerLayout>
          <div>Child Content</div>
        </ManagerLayout>
      </MemoryRouter>
    );

    const feedbackLink = await screen.findByRole('link', { name: /feedbacks/i });

    await waitFor(() => {
      expect(within(feedbackLink).getByText('4')).toBeInTheDocument();
    });
  });
});
