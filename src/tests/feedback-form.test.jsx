import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const {
  submitFeedbackMock,
  isFeedbackAlreadySubmittedMock,
  toastSuccessMock,
} = vi.hoisted(() => ({
  submitFeedbackMock: vi.fn(),
  isFeedbackAlreadySubmittedMock: vi.fn(),
  toastSuccessMock: vi.fn(),
}));

vi.mock('../services/feedbacks', async () => {
  const actual = await vi.importActual('../services/feedbacks');
  return {
    ...actual,
    submitFeedback: (...args) => submitFeedbackMock(...args),
    isFeedbackAlreadySubmitted: (...args) => isFeedbackAlreadySubmittedMock(...args),
  };
});

vi.mock('react-hot-toast', () => ({
  toast: {
    success: (...args) => toastSuccessMock(...args),
    error: vi.fn(),
  },
}));

import FeedbackForm from '../components/client/FeedbackForm';

describe('Client Feedback Form', () => {
  beforeEach(() => {
    submitFeedbackMock.mockReset();
    isFeedbackAlreadySubmittedMock.mockReset();
    toastSuccessMock.mockReset();
    isFeedbackAlreadySubmittedMock.mockReturnValue(false);
  });

  it('Feedback validation blocks submit without star rating', async () => {
    const user = userEvent.setup();
    render(<FeedbackForm tableId="table-1" orderId="order-1" />);

    const submitButton = screen.getByRole('button', { name: /submit feedback/i });
    expect(submitButton).toBeDisabled();

    await user.click(submitButton);

    expect(submitFeedbackMock).not.toHaveBeenCalled();
  });

  it('Feedback submit succeeds, shows toast, and locks form', async () => {
    const user = userEvent.setup();
    submitFeedbackMock.mockResolvedValue({ queued: false, feedback: { _id: 'f-1' } });

    render(<FeedbackForm tableId="table-2" orderId="order-2" />);

    await user.click(screen.getByRole('button', { name: /rate 4 stars/i }));
    await user.click(screen.getByRole('button', { name: /submit feedback/i }));

    await waitFor(() => {
      expect(toastSuccessMock).toHaveBeenCalledWith('Thank you for your feedback!');
    });

    expect(screen.getByText(/feedback already submitted for this order/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /submit feedback/i })).toBeDisabled();
  });

  it('Empty feedback comment is allowed', async () => {
    const user = userEvent.setup();
    submitFeedbackMock.mockResolvedValue({ queued: false, feedback: { _id: 'f-2' } });

    render(<FeedbackForm tableId="table-3" orderId="order-3" />);

    await user.click(screen.getByRole('button', { name: /rate 5 stars/i }));
    await user.click(screen.getByRole('button', { name: /submit feedback/i }));

    await waitFor(() => {
      expect(submitFeedbackMock).toHaveBeenCalledTimes(1);
    });

    const firstCallPayload = submitFeedbackMock.mock.calls[0][0];
    expect(firstCallPayload.comment).toBe('');
  });

  it('Feedback with 500-char comment submits correctly', async () => {
    const user = userEvent.setup();
    submitFeedbackMock.mockResolvedValue({ queued: false, feedback: { _id: 'f-3' } });

    render(<FeedbackForm tableId="table-4" orderId="order-4" />);

    const longComment = 'a'.repeat(510);
    const commentField = screen.getByRole('textbox', { name: /feedback comment/i });
    fireEvent.change(commentField, { target: { value: longComment } });

    expect(commentField).toHaveValue('a'.repeat(500));

    await user.click(screen.getByRole('button', { name: /rate 3 stars/i }));
    await user.click(screen.getByRole('button', { name: /submit feedback/i }));

    await waitFor(() => {
      expect(submitFeedbackMock).toHaveBeenCalledTimes(1);
    });

    const firstCallPayload = submitFeedbackMock.mock.calls[0][0];
    expect(firstCallPayload.comment).toHaveLength(500);
  });

  it('Submitting feedback twice is prevented by submitted lock', async () => {
    const user = userEvent.setup();
    isFeedbackAlreadySubmittedMock.mockReturnValue(true);

    render(<FeedbackForm tableId="table-5" orderId="order-5" />);

    expect(screen.getByRole('button', { name: /submit feedback/i })).toBeDisabled();
    expect(screen.getByText(/feedback already submitted for this order/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /rate 4 stars/i }));
    await user.click(screen.getByRole('button', { name: /submit feedback/i }));

    expect(submitFeedbackMock).not.toHaveBeenCalled();
  });

  it('Network failure during feedback submit shows graceful inline error', async () => {
    const user = userEvent.setup();
    submitFeedbackMock.mockRejectedValue({
      response: {
        data: {
          message: 'Network request failed. Please try again.',
        },
      },
    });

    render(<FeedbackForm tableId="table-6" orderId="order-6" />);

    await user.click(screen.getByRole('button', { name: /rate 2 stars/i }));
    await user.click(screen.getByRole('button', { name: /submit feedback/i }));

    await waitFor(() => {
      expect(screen.getByText(/network request failed\. please try again\./i)).toBeInTheDocument();
    });
  });
});
