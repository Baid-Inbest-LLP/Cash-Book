import { Link } from 'react-router-dom';
import { Paper, Title, Text, TextInput, Button, Stack, Center, Box, Alert } from '@mantine/core';
import { useForm } from 'react-hook-form';
import { useState } from 'react';
import { notifications } from '@mantine/notifications';
import { useForgotPassword } from '../../hooks/useAuth';
import { getApiErrorMessage } from '../../lib/queryClient';

export default function ForgotPasswordPage() {
  const { register, handleSubmit } = useForm();
  const forgotPassword = useForgotPassword();
  const [resetUrl, setResetUrl] = useState(null);
  const loading = forgotPassword.isPending;

  const onSubmit = ({ email }) => {
    forgotPassword.mutate(email, {
      onSuccess: (data) => {
        notifications.show({
          title: 'Check your email',
          message: data.message || 'If the email exists, a reset link was sent.',
          color: 'green',
        });
        if (data.data?.resetUrl) setResetUrl(data.data.resetUrl);
      },
      onError: (err) => {
        notifications.show({
          title: 'Error',
          message: getApiErrorMessage(err, 'Request failed'),
          color: 'red',
        });
      },
    });
  };

  return (
    <Center mih="100vh">
      <Box maw={420} w="100%" px="md">
        <Paper withBorder shadow="md" p="xl" radius="md">
          <Title order={3} mb="xs">
            Forgot password
          </Title>
          <Text c="dimmed" size="sm" mb="lg">
            Enter your email to receive a reset link
          </Text>
          {resetUrl && (
            <Alert color="blue" mb="md" title="Dev reset link">
              <Text size="xs" component={Link} to={resetUrl.replace(/^https?:\/\/[^/]+/, '')}>
                {resetUrl}
              </Text>
            </Alert>
          )}
          <form onSubmit={handleSubmit(onSubmit)}>
            <Stack gap="md">
              <TextInput label="Email" required {...register('email')} />
              <Button type="submit" fullWidth loading={loading}>
                Send reset link
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
