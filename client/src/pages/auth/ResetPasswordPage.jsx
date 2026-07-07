import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Paper, Title, Text, PasswordInput, Button, Stack, Center, Box } from '@mantine/core';
import { useForm } from 'react-hook-form';
import { notifications } from '@mantine/notifications';
import { useResetPassword } from '../../hooks/useAuth';
import { getApiErrorMessage } from '../../lib/queryClient';

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token');
  const { register, handleSubmit } = useForm();
  const resetPassword = useResetPassword();
  const loading = resetPassword.isPending;

  const onSubmit = ({ password }) => {
    if (!token) {
      notifications.show({ title: 'Invalid link', message: 'Missing token', color: 'red' });
      return;
    }
    resetPassword.mutate(
      { token, password },
      {
        onSuccess: () => {
          notifications.show({ title: 'Success', message: 'Password updated', color: 'green' });
          navigate('/login');
        },
        onError: (err) => {
          notifications.show({
            title: 'Error',
            message: getApiErrorMessage(err, 'Reset failed'),
            color: 'red',
          });
        },
      },
    );
  };

  return (
    <Center mih="100vh">
      <Box maw={420} w="100%" px="md">
        <Paper withBorder shadow="md" p="xl" radius="md">
          <Title order={3} mb="lg">
            Reset password
          </Title>
          <form onSubmit={handleSubmit(onSubmit)}>
            <Stack gap="md">
              <PasswordInput
                label="New password"
                required
                minLength={6}
                {...register('password', { required: true, minLength: 6 })}
              />
              <Button type="submit" fullWidth loading={loading} disabled={!token}>
                Update password
              </Button>
              <Text size="sm" ta="center">
                <Link to="/login">Back to login</Link>
              </Text>
            </Stack>
          </form>
        </Paper>
      </Box>
    </Center>
  );
}
