import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';

// Import UI components
import { Button } from '../button';
import { Badge } from '../badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../card';
import { Input } from '../input';
import { Label } from '../label';
import { Progress } from '../progress';
import { Separator } from '../separator';
import { Skeleton } from '../skeleton';
import { Textarea } from '../textarea';
import { Switch } from '../switch';
import { Checkbox } from '../checkbox';
import { Alert, AlertTitle, AlertDescription } from '../alert';
import { Avatar, AvatarFallback, AvatarImage } from '../avatar';
import {
    Table,
    TableBody,
    TableCaption,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '../table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../tabs';
import { Toggle } from '../toggle';

describe('UI Components Snapshot Tests', () => {
    describe('Button', () => {
        it('should match snapshot - default variant', () => {
            const { container } = render(<Button>Click me</Button>);
            expect(container).toMatchSnapshot();
        });

        it('should match snapshot - destructive variant', () => {
            const { container } = render(<Button variant="destructive">Delete</Button>);
            expect(container).toMatchSnapshot();
        });

        it('should match snapshot - outline variant', () => {
            const { container } = render(<Button variant="outline">Outline</Button>);
            expect(container).toMatchSnapshot();
        });

        it('should match snapshot - ghost variant', () => {
            const { container } = render(<Button variant="ghost">Ghost</Button>);
            expect(container).toMatchSnapshot();
        });

        it('should match snapshot - link variant', () => {
            const { container } = render(<Button variant="link">Link</Button>);
            expect(container).toMatchSnapshot();
        });

        it('should match snapshot - different sizes', () => {
            const { container } = render(
                <div>
                    <Button size="sm">Small</Button>
                    <Button size="default">Default</Button>
                    <Button size="lg">Large</Button>
                    <Button size="icon">🔍</Button>
                </div>
            );
            expect(container).toMatchSnapshot();
        });

        it('should match snapshot - disabled state', () => {
            const { container } = render(<Button disabled>Disabled</Button>);
            expect(container).toMatchSnapshot();
        });
    });

    describe('Badge', () => {
        it('should match snapshot - default variant', () => {
            const { container } = render(<Badge>Default</Badge>);
            expect(container).toMatchSnapshot();
        });

        it('should match snapshot - secondary variant', () => {
            const { container } = render(<Badge variant="secondary">Secondary</Badge>);
            expect(container).toMatchSnapshot();
        });

        it('should match snapshot - destructive variant', () => {
            const { container } = render(<Badge variant="destructive">Destructive</Badge>);
            expect(container).toMatchSnapshot();
        });

        it('should match snapshot - outline variant', () => {
            const { container } = render(<Badge variant="outline">Outline</Badge>);
            expect(container).toMatchSnapshot();
        });
    });

    describe('Card', () => {
        it('should match snapshot - full card structure', () => {
            const { container } = render(
                <Card>
                    <CardHeader>
                        <CardTitle>Card Title</CardTitle>
                        <CardDescription>Card description goes here</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p>Card content</p>
                    </CardContent>
                    <CardFooter>
                        <Button>Action</Button>
                    </CardFooter>
                </Card>
            );
            expect(container).toMatchSnapshot();
        });

        it('should match snapshot - minimal card', () => {
            const { container } = render(
                <Card>
                    <CardContent>Simple content</CardContent>
                </Card>
            );
            expect(container).toMatchSnapshot();
        });
    });

    describe('Input', () => {
        it('should match snapshot - default input', () => {
            const { container } = render(<Input placeholder="Enter text..." />);
            expect(container).toMatchSnapshot();
        });

        it('should match snapshot - with value', () => {
            const { container } = render(<Input value="Some value" readOnly />);
            expect(container).toMatchSnapshot();
        });

        it('should match snapshot - disabled state', () => {
            const { container } = render(<Input disabled placeholder="Disabled" />);
            expect(container).toMatchSnapshot();
        });

        it('should match snapshot - different types', () => {
            const { container } = render(
                <div>
                    <Input type="text" placeholder="Text" />
                    <Input type="email" placeholder="Email" />
                    <Input type="password" placeholder="Password" />
                    <Input type="number" placeholder="Number" />
                </div>
            );
            expect(container).toMatchSnapshot();
        });
    });

    describe('Label', () => {
        it('should match snapshot', () => {
            const { container } = render(<Label htmlFor="email">Email Address</Label>);
            expect(container).toMatchSnapshot();
        });
    });

    describe('Progress', () => {
        it('should match snapshot - 0%', () => {
            const { container } = render(<Progress value={0} />);
            expect(container).toMatchSnapshot();
        });

        it('should match snapshot - 50%', () => {
            const { container } = render(<Progress value={50} />);
            expect(container).toMatchSnapshot();
        });

        it('should match snapshot - 100%', () => {
            const { container } = render(<Progress value={100} />);
            expect(container).toMatchSnapshot();
        });
    });

    describe('Separator', () => {
        it('should match snapshot - horizontal', () => {
            const { container } = render(<Separator orientation="horizontal" />);
            expect(container).toMatchSnapshot();
        });

        it('should match snapshot - vertical', () => {
            const { container } = render(
                <div style={{ height: '100px' }}>
                    <Separator orientation="vertical" />
                </div>
            );
            expect(container).toMatchSnapshot();
        });
    });

    describe('Skeleton', () => {
        it('should match snapshot - default', () => {
            const { container } = render(<Skeleton className="w-full h-4" />);
            expect(container).toMatchSnapshot();
        });

        it('should match snapshot - avatar skeleton', () => {
            const { container } = render(<Skeleton className="h-12 w-12 rounded-full" />);
            expect(container).toMatchSnapshot();
        });
    });

    describe('Textarea', () => {
        it('should match snapshot - default', () => {
            const { container } = render(<Textarea placeholder="Enter description..." />);
            expect(container).toMatchSnapshot();
        });

        it('should match snapshot - disabled', () => {
            const { container } = render(<Textarea disabled placeholder="Disabled" />);
            expect(container).toMatchSnapshot();
        });
    });

    describe('Switch', () => {
        it('should match snapshot - unchecked', () => {
            const { container } = render(<Switch />);
            expect(container).toMatchSnapshot();
        });

        it('should match snapshot - checked', () => {
            const { container } = render(<Switch checked />);
            expect(container).toMatchSnapshot();
        });

        it('should match snapshot - disabled', () => {
            const { container } = render(<Switch disabled />);
            expect(container).toMatchSnapshot();
        });
    });

    describe('Checkbox', () => {
        it('should match snapshot - unchecked', () => {
            const { container } = render(<Checkbox />);
            expect(container).toMatchSnapshot();
        });

        it('should match snapshot - checked', () => {
            const { container } = render(<Checkbox checked />);
            expect(container).toMatchSnapshot();
        });

        it('should match snapshot - disabled', () => {
            const { container } = render(<Checkbox disabled />);
            expect(container).toMatchSnapshot();
        });
    });

    describe('Alert', () => {
        it('should match snapshot - default', () => {
            const { container } = render(
                <Alert>
                    <AlertTitle>Alert Title</AlertTitle>
                    <AlertDescription>This is an alert description.</AlertDescription>
                </Alert>
            );
            expect(container).toMatchSnapshot();
        });

        it('should match snapshot - destructive', () => {
            const { container } = render(
                <Alert variant="destructive">
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>Something went wrong.</AlertDescription>
                </Alert>
            );
            expect(container).toMatchSnapshot();
        });
    });

    describe('Avatar', () => {
        it('should match snapshot - with fallback', () => {
            const { container } = render(
                <Avatar>
                    <AvatarFallback>JD</AvatarFallback>
                </Avatar>
            );
            expect(container).toMatchSnapshot();
        });

        it('should match snapshot - with image', () => {
            const { container } = render(
                <Avatar>
                    <AvatarImage src="/avatar.png" alt="User" />
                    <AvatarFallback>JD</AvatarFallback>
                </Avatar>
            );
            expect(container).toMatchSnapshot();
        });
    });

    describe('Table', () => {
        it('should match snapshot - full table', () => {
            const { container } = render(
                <Table>
                    <TableCaption>A list of users</TableCaption>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        <TableRow>
                            <TableCell>John Doe</TableCell>
                            <TableCell>john@example.com</TableCell>
                            <TableCell>Active</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell>Jane Smith</TableCell>
                            <TableCell>jane@example.com</TableCell>
                            <TableCell>Inactive</TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            );
            expect(container).toMatchSnapshot();
        });
    });

    describe('Tabs', () => {
        it('should match snapshot', () => {
            const { container } = render(
                <Tabs defaultValue="tab1">
                    <TabsList>
                        <TabsTrigger value="tab1">Tab 1</TabsTrigger>
                        <TabsTrigger value="tab2">Tab 2</TabsTrigger>
                        <TabsTrigger value="tab3">Tab 3</TabsTrigger>
                    </TabsList>
                    <TabsContent value="tab1">Content 1</TabsContent>
                    <TabsContent value="tab2">Content 2</TabsContent>
                    <TabsContent value="tab3">Content 3</TabsContent>
                </Tabs>
            );
            expect(container).toMatchSnapshot();
        });
    });

    describe('Toggle', () => {
        it('should match snapshot - default', () => {
            const { container } = render(<Toggle>Toggle</Toggle>);
            expect(container).toMatchSnapshot();
        });

        it('should match snapshot - pressed', () => {
            const { container } = render(<Toggle pressed>Pressed</Toggle>);
            expect(container).toMatchSnapshot();
        });

        it('should match snapshot - outline variant', () => {
            const { container } = render(<Toggle variant="outline">Outline</Toggle>);
            expect(container).toMatchSnapshot();
        });
    });
});
